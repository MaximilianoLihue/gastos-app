'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/lib/types'
import { exportToExcel, exportToPDF } from '@/LogicService/transacciones/exportService'
import { parseMercadoPagoPDF } from '@/LogicService/transacciones/parseMercadoPagoClient'
import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { useLang } from '@/lib/i18n/LangContext'

export const PAGE_SIZE = 15

export interface ImportResult {
  total: number
  imported: number
  errors: string[]
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function parseDate(value: unknown): string | null {
  if (!value) return null
  // ExcelJS returns Date objects for date-formatted cells
  if (value instanceof Date) {
    if (isValid(value)) return format(value, 'yyyy-MM-dd')
    return null
  }
  // Excel serial date number (e.g. 45000 = a date in 2023)
  if (typeof value === 'number' && value > 32874 && value < 73050) {
    const utc = new Date(Date.UTC(1899, 11, 30) + value * 86400000)
    if (isValid(utc)) return format(utc, 'yyyy-MM-dd')
  }
  const str = String(value).trim()
  for (const fmt of ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'd/M/yyyy']) {
    try {
      const parsed = parse(str, fmt, new Date())
      if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')
    } catch {}
  }
  return null
}

function parseArgAmount(value: unknown): number {
  if (!value || String(value).trim() === '0,00' || String(value).trim() === '') return 0
  const str = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')
  return Math.abs(parseFloat(str) || 0)
}

function cleanDescription(value: unknown): string {
  return String(value ?? '').replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function detectBankExtract(headers: string[]): boolean {
  const h = headers.map(s => String(s).toLowerCase().trim())
  return h.includes('movimiento') && h.includes('débito') || h.includes('debito')
}

interface VisaRow {
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'gasto'
  currency: 'ARS' | 'USD'
}

function detectVisaStatement(rows: unknown[][]): boolean {
  return rows.slice(0, 5).some(r =>
    String(r[0]).toLowerCase().includes('movimientos del resumen') ||
    String(r[0]).toLowerCase().includes('visa crédito') ||
    String(r[0]).toLowerCase().includes('visa credito')
  )
}

function parseVisaStatement(rows: unknown[][]): VisaRow[] {
  const results: VisaRow[] = []
  const skipSections = ['pago de tarjeta', 'otros conceptos']
  const skipDescriptions = ['su pago en pesos', 'su pago en usd', 'total de visa', 'total de tarjeta']
  let inSkipSection = false
  let lastDate = ''

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim()
    const col1 = String(row[1] ?? '').trim()
    const col4 = String(row[4] ?? '').trim()
    const col5 = String(row[5] ?? '').trim()

    if (skipSections.some(s => col0.toLowerCase().includes(s))) { inSkipSection = true; continue }
    if (col0.toLowerCase().includes('tarjeta de') && col0.toLowerCase().includes('visa')) { inSkipSection = false; continue }
    if (col0 === 'Fecha' && col1 === 'Descripción') continue
    if (!col0 && !col1) continue
    if (col0.toLowerCase().includes('total de visa') || col0.toLowerCase().includes('total de tarjeta')) continue
    if (inSkipSection) continue

    if (col0.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = col0.split('/')
      lastDate = `${y}-${m}-${d}`
    }
    if (!lastDate || !col1) continue
    const desc = col1.trim()
    if (skipDescriptions.some(s => desc.toLowerCase().includes(s))) continue

    if (col4 && col4 !== '') {
      const raw = col4.replace(/\$/g, '').trim()
      const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
      if (!isNaN(num) && num !== 0) results.push({ date: lastDate, description: desc, amount: Math.abs(num), type: num < 0 ? 'ingreso' : 'gasto', currency: 'ARS' })
    }
    if (col5 && col5 !== '') {
      const raw = col5.replace(/U\$S/g, '').replace(/\$/g, '').trim()
      const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
      if (!isNaN(num) && num !== 0) results.push({ date: lastDate, description: desc, amount: Math.abs(num), type: num < 0 ? 'ingreso' : 'gasto', currency: 'USD' })
    }
  }
  return results
}

const AUTO_CATEGORY_RULES: { keywords: string[]; category: string; color: string }[] = [
  { keywords: ['transferencia', 'transf ', 'trnsf', 'acreditacion', 'acreditación', 'extraccion', 'extracción', 'reintegro', 'devolucion', 'devolución', 'mercado pago', 'mercadopago', 'cuenta dni', 'ualá', 'uala', 'brubank', 'naranja x', 'naranjax', 'prex', 'bimo'], category: 'Transferencias', color: '#6366f1' },
  { keywords: ['uber', 'cabify', 'remis', 'taxi', 'sube', 'colectivo', 'tren', 'subte', 'ypf', 'shell', 'axion', 'nafta', 'combustible', 'peaje'], category: 'Transporte', color: '#3b82f6' },
  { keywords: ['supermercado', 'disco', 'jumbo', 'carrefour', 'coto', 'dia ', 'vea ', 'walmart', 'vital', 'verduleria', 'almacen'], category: 'Comida', color: '#f97316' },
  { keywords: ['rappi', 'pedidosya', 'mcdonalds', 'burger king', 'kentucky', 'subway', 'mostaza', 'restaurant', 'pizza', 'sushi', 'delivery'], category: 'Comida', color: '#f97316' },
  { keywords: ['netflix', 'spotify', 'disney', 'hbo', 'flow', 'paramount', 'steam', 'playstation', 'xbox'], category: 'Entretenimiento', color: '#a855f7' },
  { keywords: ['farmacia', 'farma', 'drogueria', 'medico', 'doctor', 'clinica', 'hospital', 'osde', 'swiss', 'prepaga', 'obra social'], category: 'Salud', color: '#ec4899' },
  { keywords: ['edesur', 'edenor', 'metrogas', 'aysa', 'telecom', 'fibertel', 'cablevision'], category: 'Servicios', color: '#eab308' },
  { keywords: ['alquiler', 'expensas', 'inmobiliaria'], category: 'Vivienda', color: '#14b8a6' },
  { keywords: ['zara', 'h&m', 'lacoste', 'adidas', 'nike', 'calzado', 'indumentaria', 'falabella'], category: 'Ropa', color: '#f43f5e' },
  { keywords: ['suscripcion', 'suscripción', 'rescate', 'fima', 'fondo', 'cuotaparte', 'gainvest', 'balanz', 'iol', 'invertironline', 'ppx', 'adcap', 'puente', 'portfolio personal', 'sigma', 'pellegrini', 'premier', 'clase a', 'clase b', 'renta fija', 'renta variable'], category: 'Inversiones', color: '#84cc16' },
]

function guessCategory(description: string): { category: string; color: string } | null {
  const lower = description.toLowerCase()
  for (const rule of AUTO_CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) return { category: rule.category, color: rule.color }
  }
  return null
}

function parseType(value: unknown): 'ingreso' | 'gasto' | null {
  const str = String(value ?? '').toLowerCase().trim()
  if (['ingreso', 'income', 'entrada', 'in'].includes(str)) return 'ingreso'
  if (['gasto', 'expense', 'egreso', 'salida', 'out'].includes(str)) return 'gasto'
  return null
}

export function downloadTemplate() {
  ;(async () => {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('Transacciones')
    ws.columns = [
      { header: 'fecha', width: 14 },
      { header: 'tipo', width: 10 },
      { header: 'monto', width: 12 },
      { header: 'descripcion', width: 25 },
      { header: 'categoria', width: 20 },
    ]
    ws.addRow(['15/03/2025', 'gasto', 5000, 'Supermercado', 'Comida'])
    ws.addRow(['16/03/2025', 'ingreso', 150000, 'Sueldo', 'Trabajo'])
    ws.addRow(['17/03/2025', 'gasto', 2000, 'Nafta', 'Transporte'])
    const buf = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-gastos.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  })()
}

function txKey(date: string, description: string | null, type: string, amount: number): string {
  const desc = String(description ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  return `${date}__${desc}__${type}__${Number(amount).toFixed(2)}`
}

async function filterDuplicates(
  supabase: ReturnType<typeof createClient>,
  rows: { date: string; description: string | null; type: string; amount: number }[]
): Promise<number[]> {
  if (rows.length === 0) return []
  const dates = [...new Set(rows.map(r => r.date))]
  const { data: existing } = await supabase.from('transactions').select('date, description, type, amount').in('date', dates)
  const existingKeys = new Set((existing ?? []).map(t => txKey(t.date, t.description, t.type, t.amount)))
  return rows.map((r, i) => ({ i, key: txKey(r.date, r.description, r.type, r.amount) }))
    .filter(({ key }) => existingKeys.has(key))
    .map(({ i }) => i)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTransacciones() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLang()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'ingreso' | 'gasto'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortDesc, setSortDesc] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState<{ deleted: number } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [receiptParsing, setReceiptParsing] = useState(false)
  const [receiptPreview, setReceiptPreview] = useState<{
    date: string; description: string; amount: number; type: 'ingreso' | 'gasto'
  } | null>(null)
  const [quickCatTx, setQuickCatTx] = useState<string | null>(null)
  const [savingCatTx, setSavingCatTx] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; color: string; type: string }[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const importMenuRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    if (!quickCatTx) return
    const close = () => setQuickCatTx(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [quickCatTx])

  useEffect(() => {
    if (!showImportMenu && !showExportMenu) return
    const close = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) setShowImportMenu(false)
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showImportMenu, showExportMenu])

  useEffect(() => {
    if (!catDropdownOpen) return
    const close = () => setCatDropdownOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [catDropdownOpen])

  // ── Core PDF import logic (used by input handler and share target) ───────────
  async function importPDFFile(file: File) {
    setImporting(true)
    setImportResult(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const parsed = await parseMercadoPagoPDF(file)
      const result: ImportResult = { total: parsed.length, imported: 0, errors: [] }
      if (parsed.length === 0) {
        result.errors.push(t.transactions.errorNoPdfTxs)
        setImportResult(result)
        return
      }
      const { data: existingCats } = await supabase.from('categories').select('id, name, type').eq('user_id', user.id)
      const catCache: Record<string, string> = {}
      for (const c of existingCats ?? []) catCache[`${c.name.toLowerCase()}__${c.type}`] = c.id
      const ensureCategory = async (name: string, type: 'ingreso' | 'gasto', color: string): Promise<string> => {
        const key = `${name.toLowerCase()}__${type}`
        if (catCache[key]) return catCache[key]
        const { data } = await supabase.from('categories').insert({ user_id: user.id, name, type, color }).select('id').single()
        if (data?.id) catCache[key] = data.id
        return data?.id ?? ''
      }
      const toInsert: object[] = []
      for (const tx of parsed) {
        let category_id: string | null = null
        const guessed = guessCategory(tx.description)
        if (guessed) category_id = await ensureCategory(guessed.category, tx.type, guessed.color) || null
        toInsert.push({ user_id: user.id, date: tx.date, type: tx.type, amount: tx.amount, description: tx.description, category_id })
      }
      const dupIndexes = new Set(await filterDuplicates(supabase, toInsert as { date: string; description: string | null; type: string; amount: number }[]))
      const unique = toInsert.filter((_, i) => !dupIndexes.has(i))
      const skipped = toInsert.length - unique.length
      if (skipped > 0) result.errors.push(t.transactions.errorDuplicatesSkipped(skipped))
      if (unique.length > 0) {
        const { error } = await supabase.from('transactions').insert(unique)
        if (error) result.errors.push(t.transactions.errorSave(error.message))
        else { result.imported = unique.length; load() }
      }
      setImportResult(result)
    } catch (err) {
      setImportResult({ total: 0, imported: 0, errors: [t.transactions.errorReadPdf(String(err))] })
    } finally {
      setImporting(false)
    }
  }

  // Handle shared receipt from mobile share sheet
  useEffect(() => {
    if (searchParams.get('shared') !== '1') return
    router.replace('/transacciones')

    async function processShared() {
      try {
        const cache = await caches.open('shared-receipt-v1')
        const response = await cache.match('/pending-receipt')
        if (!response) return
        const blob = await response.blob()
        const fileName = response.headers.get('X-File-Name') || 'comprobante.jpg'
        const contentType = blob.type || response.headers.get('Content-Type') || 'image/jpeg'
        const file = new File([blob], fileName, { type: contentType })
        await cache.delete('/pending-receipt')

        if (contentType === 'application/pdf') {
          await importPDFFile(file)
        } else {
          setReceiptParsing(true)
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch('/api/parse-receipt', { method: 'POST', body: formData })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || t.transactions.errorProcessReceipt)
          setReceiptPreview(json.transaction)
        }
      } catch (err) {
        setImportResult({ total: 0, imported: 0, errors: [String(err)] })
      } finally {
        setReceiptParsing(false)
      }
    }

    processShared()
  }, [searchParams, router])

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('transactions')
      .select('*, category:categories(name, color, type)', { count: 'exact' })

    if (filterType !== 'all') query = query.eq('type', filterType)
    if (search.trim()) query = query.ilike('description', `%${search.trim()}%`)
    if (filterCategory === 'none') {
      query = query.is('category_id', null)
    } else if (filterCategory !== 'all') {
      query = query.eq('category_id', filterCategory)
    }

    query = query
      .gte('date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'))
      .order('date', { ascending: !sortDesc })
      .order('created_at', { ascending: !sortDesc })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    const { data, count } = await query
    setTransactions((data as Transaction[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [filterType, filterCategory, search, page, sortDesc, currentMonth])

  useEffect(() => {
    load()
    supabase.from('categories').select('id, name, color, type').order('name')
      .then(({ data }) => setAllCategories(data ?? []))
  }, [load])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function handleQuickCategory(txId: string, categoryId: string) {
    setQuickCatTx(null)
    setSavingCatTx(txId)
    await supabase.from('transactions').update({ category_id: categoryId }).eq('id', txId)
    const cat = allCategories.find(c => c.id === categoryId)
    if (cat) {
      setTransactions(prev => prev.map(tx =>
        tx.id === txId ? { ...tx, category_id: categoryId, category: cat as typeof tx.category } : tx
      ))
    }
    setSavingCatTx(null)
  }

  async function handleDelete(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  function handleEdit(tx: Transaction) {
    setEditTx(tx)
    setShowForm(true)
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditTx(null)
    load()
  }

  async function handleExportExcel() {
    const { data } = await supabase.from('transactions').select('*, category:categories(name, color, type)').order('date', { ascending: false })
    exportToExcel((data as Transaction[]) ?? [])
  }

  async function handleExportPDF() {
    const { data } = await supabase.from('transactions').select('*, category:categories(name, color, type)').order('date', { ascending: false })
    const txs = (data as Transaction[]) ?? []
    const totalIngresos = txs.filter(tx => tx.type === 'ingreso').reduce((s, tx) => s + Number(tx.amount), 0)
    const totalGastos = txs.filter(tx => tx.type === 'gasto').reduce((s, tx) => s + Number(tx.amount), 0)
    exportToPDF(txs, { totalIngresos, totalGastos, balance: totalIngresos - totalGastos })
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const buffer = await file.arrayBuffer()
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      const ws = workbook.worksheets[0]
      const allRows: unknown[][] = []
      ws.eachRow({ includeEmpty: false }, (row) => {
        const vals = (row.values as unknown[]).slice(1) // exceljs is 1-indexed
        allRows.push(vals.map(v => {
          if (v === null || v === undefined) return ''
          if (v instanceof Date) return v
          if (typeof v === 'object') {
            if ('richText' in v) return (v as { richText: { text: string }[] }).richText.map(rt => rt.text).join('')
            if ('text' in v) return (v as { text: string }).text
            if ('result' in v) return (v as { result: unknown }).result ?? ''
            return ''
          }
          return v
        }))
      })

      const result: ImportResult = { total: 0, imported: 0, errors: [] }
      const toInsert: object[] = []

      if (detectVisaStatement(allRows)) {
        const { data: existingCats } = await supabase.from('categories').select('id, name, type').eq('user_id', user.id)
        const catCache: Record<string, string> = {}
        for (const c of existingCats ?? []) catCache[`${c.name.toLowerCase()}__${c.type}`] = c.id

        const ensureCategory = async (name: string, type: 'ingreso' | 'gasto', color: string) => {
          const key = `${name.toLowerCase()}__${type}`
          if (catCache[key]) return catCache[key]
          const { data } = await supabase.from('categories').insert({ user_id: user.id, name, type, color }).select('id').single()
          if (data?.id) catCache[key] = data.id
          return data?.id ?? ''
        }

        const parsed = parseVisaStatement(allRows)
        result.total = parsed.length
        for (const tx of parsed) {
          let category_id: string | null = null
          const guessed = guessCategory(tx.description)
          if (guessed) category_id = await ensureCategory(guessed.category, tx.type, guessed.color) || null
          toInsert.push({ user_id: user.id, date: tx.date, type: tx.type, amount: tx.amount, currency: tx.currency, description: tx.description, category_id })
        }

        if (toInsert.length > 0) {
          const dupIndexes = new Set(await filterDuplicates(supabase, toInsert as { date: string; description: string | null; type: string; amount: number }[]))
          const unique = toInsert.filter((_, i) => !dupIndexes.has(i))
          const skipped = toInsert.length - unique.length
          if (skipped > 0) result.errors.push(t.transactions.errorDuplicatesSkipped(skipped))
          if (unique.length > 0) {
            const { error } = await supabase.from('transactions').insert(unique)
            if (error) result.errors.push(t.transactions.errorSave(error.message))
            else { result.imported = unique.length; load() }
          }
        }
        setImportResult(result)
        return
      }

      let headerRowIndex = 0
      for (let i = 0; i < Math.min(allRows.length, 10); i++) {
        if (allRows[i].some(cell => String(cell).toLowerCase().trim() === 'fecha')) { headerRowIndex = i; break }
      }

      const headers = allRows[headerRowIndex].map(h => String(h).trim())
      const dataRows = allRows.slice(headerRowIndex + 1).filter(r => r.some(c => c !== ''))
      const normalize = (s: string) => s.toLowerCase().trim().replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')
      const normHeaders = headers.map(normalize)
      const isBankExtract = detectBankExtract(headers)

      result.total = dataRows.length

      if (isBankExtract) {
        const iFecha = normHeaders.findIndex(h => h === 'fecha')
        const iMovimiento = normHeaders.findIndex(h => h === 'movimiento')
        const iDebito = normHeaders.findIndex(h => h.includes('debito') || h.includes('débito'))
        const iCredito = normHeaders.findIndex(h => h.includes('credito') || h.includes('crédito'))

        const { data: existingCats } = await supabase.from('categories').select('id, name, type').eq('user_id', user.id)
        const catCache: Record<string, string> = {}
        for (const c of existingCats ?? []) catCache[`${c.name.toLowerCase()}__${c.type}`] = c.id

        const ensureCategory = async (name: string, type: 'ingreso' | 'gasto', color: string): Promise<string> => {
          const key = `${name.toLowerCase()}__${type}`
          if (catCache[key]) return catCache[key]
          const { data } = await supabase.from('categories').insert({ user_id: user.id, name, type, color }).select('id').single()
          if (data?.id) catCache[key] = data.id
          return data?.id ?? ''
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          const rowNum = headerRowIndex + i + 2
          const date = parseDate(row[iFecha])
          if (!date) { result.errors.push(t.transactions.errorInvalidDate(rowNum)); continue }
          const debito = iDebito >= 0 ? parseArgAmount(row[iDebito]) : 0
          const credito = iCredito >= 0 ? parseArgAmount(row[iCredito]) : 0
          if (debito === 0 && credito === 0) continue
          const description = iMovimiento >= 0 ? cleanDescription(row[iMovimiento]) : null
          const type = credito > 0 ? 'ingreso' : 'gasto'
          const amount = credito > 0 ? credito : debito
          let category_id: string | null = null
          if (description) {
            const guessed = guessCategory(description)
            if (guessed) category_id = await ensureCategory(guessed.category, type, guessed.color)
          }
          toInsert.push({ user_id: user.id, date, type, amount, currency: 'ARS', description, category_id })
        }
      } else {
        const { data: categories } = await supabase.from('categories').select('id, name, type').eq('user_id', user.id)
        const iF = normHeaders.findIndex(h => ['fecha','date','fec'].includes(h))
        const iT = normHeaders.findIndex(h => ['tipo','type','clase'].includes(h))
        const iM = normHeaders.findIndex(h => ['monto','amount','importe','valor'].includes(h))
        const iD = normHeaders.findIndex(h => ['descripcion','description','detalle','concepto'].includes(h))
        const iC = normHeaders.findIndex(h => ['categoria','category','cat'].includes(h))
        const iCur = normHeaders.findIndex(h => ['moneda','currency','divisa'].includes(h))

        if (iF < 0 || iT < 0 || iM < 0) {
          result.errors.push(t.transactions.errorMissingColumns)
          setImportResult(result)
          return
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          const rowNum = headerRowIndex + i + 2
          const date = parseDate(row[iF])
          if (!date) { result.errors.push(t.transactions.errorInvalidDateValue(rowNum, String(row[iF]))); continue }
          const type = parseType(row[iT])
          if (!type) { result.errors.push(t.transactions.errorInvalidType(rowNum, String(row[iT]))); continue }
          const amount = parseFloat(String(row[iM]).replace(/\./g,'').replace(',','.').replace(/[^0-9.]/g,''))
          if (isNaN(amount) || amount <= 0) { result.errors.push(t.transactions.errorInvalidAmount(rowNum)); continue }
          const description = iD >= 0 ? cleanDescription(row[iD]) || null : null
          let category_id: string | null = null
          if (iC >= 0 && row[iC]) {
            const catName = normalize(String(row[iC]))
            const match = (categories ?? []).find(c => normalize(c.name) === catName)
            if (match) category_id = match.id
          }
          if (!category_id && description) {
            const guessed = guessCategory(description)
            if (guessed) {
              const existing = (categories ?? []).find(c => c.name.toLowerCase() === guessed.category.toLowerCase() && c.type === type)
              if (existing) {
                category_id = existing.id
              } else {
                const { data: newCat } = await supabase.from('categories').insert({ user_id: user.id, name: guessed.category, type, color: guessed.color }).select('id').single()
                category_id = newCat?.id ?? null
              }
            }
          }
          const rawCur = iCur >= 0 ? String(row[iCur] ?? '').trim().toUpperCase() : ''
          const currency: 'ARS' | 'USD' = rawCur === 'USD' ? 'USD' : 'ARS'
          toInsert.push({ user_id: user.id, date, type, amount, currency, description, category_id })
        }
      }

      if (toInsert.length > 0) {
        const dupIndexes = new Set(await filterDuplicates(supabase, toInsert as { date: string; description: string | null; type: string; amount: number }[]))
        const unique = toInsert.filter((_, i) => !dupIndexes.has(i))
        const skipped = toInsert.length - unique.length
        if (skipped > 0) result.errors.push(t.transactions.errorDuplicatesSkipped(skipped))
        if (unique.length > 0) {
          const { error } = await supabase.from('transactions').insert(unique)
          if (error) result.errors.push(t.transactions.errorSave(error.message))
          else { result.imported = unique.length; load() }
        }
      }
      setImportResult(result)
    } catch (err) {
      setImportResult({ total: 0, imported: 0, errors: [t.transactions.errorReadFile(String(err))] })
    } finally {
      setImporting(false)
    }
  }

  async function handleImportPDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await importPDFFile(file)
  }

  async function handleCleanDuplicates() {
    setCleaning(true)
    try {
      const { data: all } = await supabase.from('transactions').select('id, date, description, type, amount').order('created_at', { ascending: true })
      if (!all || all.length === 0) return
      const seen = new Set<string>()
      const toDelete: string[] = []
      for (const tx of all) {
        const key = txKey(tx.date, tx.description, tx.type, tx.amount)
        if (seen.has(key)) toDelete.push(tx.id)
        else seen.add(key)
      }
      if (toDelete.length === 0) { setCleanResult({ deleted: 0 }); return }
      for (let i = 0; i < toDelete.length; i += 50) {
        await supabase.from('transactions').delete().in('id', toDelete.slice(i, i + 50))
      }
      setCleanResult({ deleted: toDelete.length })
      load()
    } finally {
      setCleaning(false)
    }
  }

  async function handleClearAll() {
    setClearing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('transactions').delete().eq('user_id', user.id)
      load()
    } finally {
      setClearing(false)
      setShowClearConfirm(false)
    }
  }

  async function handleImportReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setReceiptParsing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || t.transactions.errorProcessReceipt)
      setReceiptPreview(json.transaction)
    } catch (err) {
      setImportResult({ total: 0, imported: 0, errors: [String(err)] })
    } finally {
      setReceiptParsing(false)
    }
  }

  async function handleConfirmReceipt() {
    if (!receiptPreview) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let category_id: string | null = null
    const guessed = guessCategory(receiptPreview.description)
    if (guessed) {
      const { data: existingCat } = await supabase.from('categories').select('id').eq('user_id', user.id).eq('name', guessed.category).eq('type', receiptPreview.type).maybeSingle()
      if (existingCat?.id) {
        category_id = existingCat.id
      } else {
        const { data: newCat } = await supabase.from('categories').insert({ user_id: user.id, name: guessed.category, type: receiptPreview.type, color: guessed.color }).select('id').single()
        category_id = newCat?.id ?? null
      }
    }
    await supabase.from('transactions').insert({
      user_id: user.id,
      date: receiptPreview.date,
      type: receiptPreview.type,
      amount: receiptPreview.amount,
      description: receiptPreview.description,
      category_id,
    })
    setReceiptPreview(null)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    transactions,
    loading,
    showForm, setShowForm,
    editTx, setEditTx,
    search, setSearch,
    filterType, setFilterType,
    page, setPage,
    total,
    sortDesc, setSortDesc,
    filterCategory, setFilterCategory,
    catDropdownOpen, setCatDropdownOpen,
    currentMonth, setCurrentMonth,
    deleteConfirm, setDeleteConfirm,
    importing,
    importResult, setImportResult,
    cleaning,
    cleanResult, setCleanResult,
    showClearConfirm, setShowClearConfirm,
    clearing,
    showImportMenu, setShowImportMenu,
    showExportMenu, setShowExportMenu,
    receiptParsing,
    receiptPreview, setReceiptPreview,
    quickCatTx, setQuickCatTx,
    savingCatTx,
    allCategories,
    fileInputRef,
    pdfInputRef,
    receiptInputRef,
    importMenuRef,
    exportMenuRef,
    totalPages,
    load,
    handleQuickCategory,
    handleDelete,
    handleEdit,
    handleFormSuccess,
    handleExportExcel,
    handleExportPDF,
    handleImportExcel,
    handleImportPDF,
    handleCleanDuplicates,
    handleClearAll,
    handleImportReceipt,
    handleConfirmReceipt,
  }
}
