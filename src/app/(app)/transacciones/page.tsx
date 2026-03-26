'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/lib/types'
import TransactionForm from '@/components/TransactionForm'
import { exportToExcel, exportToPDF } from '@/lib/export'
import { parseMercadoPagoPDF } from '@/lib/parsePDF'
import * as XLSX from 'xlsx'
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  Upload,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Tag,
  Camera,
} from 'lucide-react'
import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { S } from './page.styles'

const PAGE_SIZE = 15

interface ImportResult {
  total: number
  imported: number
  errors: string[]
}

function parseDate(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }
  const str = String(value).trim()
  const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'd/M/yyyy']
  for (const fmt of formats) {
    try {
      const parsed = parse(str, fmt, new Date())
      if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')
    } catch {}
  }
  return null
}

function parseArgAmount(value: unknown): number {
  if (!value || String(value).trim() === '0,00' || String(value).trim() === '') return 0
  // Format: -6.074,00 or 6.074,00
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

function detectVisaStatement(rows: string[][]): boolean {
  return rows.slice(0, 5).some(r =>
    String(r[0]).toLowerCase().includes('movimientos del resumen') ||
    String(r[0]).toLowerCase().includes('visa crédito') ||
    String(r[0]).toLowerCase().includes('visa credito')
  )
}

interface VisaRow {
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'gasto'
  currency: 'ARS' | 'USD'
}

function parseVisaStatement(rows: string[][]): VisaRow[] {
  const results: VisaRow[] = []
  const skipSections = ['pago de tarjeta', 'otros conceptos']
  const skipDescriptions = ['su pago en pesos', 'su pago en usd', 'total de visa', 'total de tarjeta']

  let inSkipSection = false
  let lastDate = ''

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim()
    const col1 = String(row[1] ?? '').trim()
    const col4 = String(row[4] ?? '').trim() // Monto en pesos
    const col5 = String(row[5] ?? '').trim() // Monto en dólares

    // Detect section headers to skip
    if (skipSections.some(s => col0.toLowerCase().includes(s))) {
      inSkipSection = true
      continue
    }

    // New card section resets skip
    if (col0.toLowerCase().includes('tarjeta de') && col0.toLowerCase().includes('visa')) {
      inSkipSection = false
      continue
    }

    // Skip header rows
    if (col0 === 'Fecha' && col1 === 'Descripción') continue

    // Skip total rows and empty rows
    if (!col0 && !col1) continue
    if (col0.toLowerCase().includes('total de visa') || col0.toLowerCase().includes('total de tarjeta')) continue

    if (inSkipSection) continue

    // Update last known date
    if (col0.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = col0.split('/')
      lastDate = `${y}-${m}-${d}`
    }

    if (!lastDate || !col1) continue

    const desc = col1.trim()
    if (skipDescriptions.some(s => desc.toLowerCase().includes(s))) continue

    // Parse ARS amount
    if (col4 && col4 !== '') {
      const raw = col4.replace(/\$/g, '').trim()
      const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
      if (!isNaN(num) && num !== 0) {
        results.push({
          date: lastDate,
          description: desc,
          amount: Math.abs(num),
          type: num < 0 ? 'ingreso' : 'gasto',
          currency: 'ARS',
        })
      }
    }

    // Parse USD amount
    if (col5 && col5 !== '') {
      const raw = col5.replace(/U\$S/g, '').replace(/\$/g, '').trim()
      const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
      if (!isNaN(num) && num !== 0) {
        results.push({
          date: lastDate,
          description: desc,
          amount: Math.abs(num),
          type: num < 0 ? 'ingreso' : 'gasto',
          currency: 'USD',
        })
      }
    }
  }

  return results
}

// Reglas de auto-categorización: si la descripción contiene alguna de estas palabras,
// se asigna a la categoría indicada (nombre exacto de la categoría en la app)
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
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { category: rule.category, color: rule.color }
    }
  }
  return null
}

function parseType(value: unknown): 'ingreso' | 'gasto' | null {
  const str = String(value ?? '').toLowerCase().trim()
  if (['ingreso', 'income', 'entrada', 'in'].includes(str)) return 'ingreso'
  if (['gasto', 'expense', 'egreso', 'salida', 'out'].includes(str)) return 'gasto'
  return null
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const data = [
    ['fecha', 'tipo', 'monto', 'descripcion', 'categoria'],
    ['15/03/2025', 'gasto', 5000, 'Supermercado', 'Comida'],
    ['16/03/2025', 'ingreso', 150000, 'Sueldo', 'Trabajo'],
    ['17/03/2025', 'gasto', 2000, 'Nafta', 'Transporte'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones')
  XLSX.writeFile(wb, 'plantilla-gastos.xlsx')
}

function txKey(date: string, description: string | null, type: string, amount: number): string {
  const desc = String(description ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  const amt = Number(amount).toFixed(2)
  return `${date}__${desc}__${type}__${amt}`
}

async function filterDuplicates(
  supabase: ReturnType<typeof createClient>,
  rows: { date: string; description: string | null; type: string; amount: number }[]
): Promise<number[]> {
  if (rows.length === 0) return []
  const dates = [...new Set(rows.map(r => r.date))]
  const { data: existing } = await supabase
    .from('transactions')
    .select('date, description, type, amount')
    .in('date', dates)
  const existingKeys = new Set(
    (existing ?? []).map(t => txKey(t.date, t.description, t.type, t.amount))
  )
  return rows
    .map((r, i) => ({ i, key: txKey(r.date, r.description, r.type, r.amount) }))
    .filter(({ key }) => existingKeys.has(key))
    .map(({ i }) => i)
}

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatAmount(value: number, currency: 'ARS' | 'USD' = 'ARS'): string {
  return currency === 'USD' ? formatUSD(value) : formatARS(value)
}

function TransaccionesPageInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const importMenuRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [receiptParsing, setReceiptParsing] = useState(false)
  const [receiptPreview, setReceiptPreview] = useState<{
    date: string; description: string; amount: number; type: 'ingreso' | 'gasto'
  } | null>(null)
  const [quickCatTx, setQuickCatTx] = useState<string | null>(null)
  const [savingCatTx, setSavingCatTx] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; color: string; type: string }[]>([])

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
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
        await cache.delete('/pending-receipt')

        setReceiptParsing(true)
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/parse-receipt', { method: 'POST', body: formData })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Error al procesar el comprobante')
        setReceiptPreview(json.transaction)
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

    if (filterType !== 'all') {
      query = query.eq('type', filterType)
    }

    if (search.trim()) {
      query = query.ilike('description', `%${search.trim()}%`)
    }

    if (filterCategory === 'none') {
      query = query.is('category_id', null)
    } else if (filterCategory !== 'all') {
      query = query.eq('category_id', filterCategory)
    }

    // Filter by current month
    query = query
      .gte('date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'))

    query = query
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

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
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(name, color, type)')
      .order('date', { ascending: false })
    exportToExcel((data as Transaction[]) ?? [])
  }

  async function handleExportPDF() {
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(name, color, type)')
      .order('date', { ascending: false })

    const txs = (data as Transaction[]) ?? []
    const totalIngresos = txs.filter((t) => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
    const totalGastos = txs.filter((t) => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0)

    exportToPDF(txs, {
      totalIngresos,
      totalGastos,
      balance: totalIngresos - totalGastos,
    })
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
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]

      const result: ImportResult = { total: 0, imported: 0, errors: [] }
      const toInsert: object[] = []

      // ── Visa / credit card statement ──────────────────────────────────────
      if (detectVisaStatement(allRows)) {
        const { data: existingCats } = await supabase
          .from('categories').select('id, name, type').eq('user_id', user.id)
        const catCache: Record<string, string> = {}
        for (const c of existingCats ?? []) catCache[`${c.name.toLowerCase()}__${c.type}`] = c.id

        const ensureCategory = async (name: string, type: 'ingreso' | 'gasto', color: string) => {
          const key = `${name.toLowerCase()}__${type}`
          if (catCache[key]) return catCache[key]
          const { data } = await supabase.from('categories')
            .insert({ user_id: user.id, name, type, color }).select('id').single()
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
          if (skipped > 0) result.errors.push(`${skipped} transacción(es) ya existían y fueron omitidas`)
          if (unique.length > 0) {
            const { error } = await supabase.from('transactions').insert(unique)
            if (error) result.errors.push(`Error al guardar: ${error.message}`)
            else { result.imported = unique.length; load() }
          }
        }
        setImportResult(result)
        return
      }

      // Find the header row (look for "Fecha" in any row)
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(allRows.length, 10); i++) {
        if (allRows[i].some(cell => String(cell).toLowerCase().trim() === 'fecha')) {
          headerRowIndex = i
          break
        }
      }

      const headers = allRows[headerRowIndex].map(h => String(h).trim())
      const dataRows = allRows.slice(headerRowIndex + 1).filter(r => r.some(c => c !== ''))

      const normalize = (s: string) => s.toLowerCase().trim()
        .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')

      const normHeaders = headers.map(normalize)
      const isBankExtract = detectBankExtract(headers)

      result.total = dataRows.length

      if (isBankExtract) {
        // Banco Galicia / bank extract format
        // Columns: Fecha, Movimiento, Débito, Crédito, Saldo Parcial, Comentarios
        const iFecha = normHeaders.findIndex(h => h === 'fecha')
        const iMovimiento = normHeaders.findIndex(h => h === 'movimiento')
        const iDebito = normHeaders.findIndex(h => h.includes('debito') || h.includes('débito'))
        const iCredito = normHeaders.findIndex(h => h.includes('credito') || h.includes('crédito'))

        // Load categories and auto-create missing ones
        const { data: existingCats } = await supabase
          .from('categories').select('id, name, type').eq('user_id', user.id)

        const catCache: Record<string, string> = {}
        for (const c of existingCats ?? []) {
          catCache[`${c.name.toLowerCase()}__${c.type}`] = c.id
        }

        const ensureCategory = async (name: string, type: 'ingreso' | 'gasto', color: string): Promise<string> => {
          const key = `${name.toLowerCase()}__${type}`
          if (catCache[key]) return catCache[key]
          const { data } = await supabase.from('categories')
            .insert({ user_id: user.id, name, type, color })
            .select('id').single()
          if (data?.id) catCache[key] = data.id
          return data?.id ?? ''
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          const rowNum = headerRowIndex + i + 2

          const date = parseDate(row[iFecha])
          if (!date) { result.errors.push(`Fila ${rowNum}: fecha inválida`); continue }

          const debito = iDebito >= 0 ? parseArgAmount(row[iDebito]) : 0
          const credito = iCredito >= 0 ? parseArgAmount(row[iCredito]) : 0

          if (debito === 0 && credito === 0) continue

          const description = iMovimiento >= 0 ? cleanDescription(row[iMovimiento]) : null
          const type = credito > 0 ? 'ingreso' : 'gasto'
          const amount = credito > 0 ? credito : debito

          let category_id: string | null = null
          if (description) {
            const guessed = guessCategory(description)
            if (guessed) {
              category_id = await ensureCategory(guessed.category, type, guessed.color)
            }
          }

          toInsert.push({ user_id: user.id, date, type, amount, currency: 'ARS', description, category_id })
        }
      } else {
        // Generic format: fecha, tipo, monto, descripcion, categoria
        const { data: categories } = await supabase
          .from('categories').select('id, name, type').eq('user_id', user.id)

        const iF = normHeaders.findIndex(h => ['fecha','date','fec'].includes(h))
        const iT = normHeaders.findIndex(h => ['tipo','type','clase'].includes(h))
        const iM = normHeaders.findIndex(h => ['monto','amount','importe','valor'].includes(h))
        const iD = normHeaders.findIndex(h => ['descripcion','description','detalle','concepto'].includes(h))
        const iC = normHeaders.findIndex(h => ['categoria','category','cat'].includes(h))
        const iCur = normHeaders.findIndex(h => ['moneda','currency','divisa'].includes(h))

        if (iF < 0 || iT < 0 || iM < 0) {
          result.errors.push('Columnas requeridas no encontradas: fecha, tipo, monto')
          setImportResult(result)
          return
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          const rowNum = headerRowIndex + i + 2

          const date = parseDate(row[iF])
          if (!date) { result.errors.push(`Fila ${rowNum}: fecha inválida "${row[iF]}"`); continue }

          const type = parseType(row[iT])
          if (!type) { result.errors.push(`Fila ${rowNum}: tipo inválido "${row[iT]}"`); continue }

          const amount = parseFloat(String(row[iM]).replace(/\./g,'').replace(',','.').replace(/[^0-9.]/g,''))
          if (isNaN(amount) || amount <= 0) { result.errors.push(`Fila ${rowNum}: monto inválido`); continue }

          const description = iD >= 0 ? cleanDescription(row[iD]) || null : null

          let category_id: string | null = null
          if (iC >= 0 && row[iC]) {
            const catName = normalize(String(row[iC]))
            const match = (categories ?? []).find(c => normalize(c.name) === catName)
            if (match) category_id = match.id
          }
          // Fall back to auto-categorization if no category column or no match
          if (!category_id && description) {
            const guessed = guessCategory(description)
            if (guessed) {
              const existing = (categories ?? []).find(
                c => c.name.toLowerCase() === guessed.category.toLowerCase() && c.type === type
              )
              if (existing) {
                category_id = existing.id
              } else {
                const { data: newCat } = await supabase.from('categories')
                  .insert({ user_id: user.id, name: guessed.category, type, color: guessed.color })
                  .select('id').single()
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
        if (skipped > 0) result.errors.push(`${skipped} transacción(es) ya existían y fueron omitidas`)
        if (unique.length > 0) {
          const { error } = await supabase.from('transactions').insert(unique)
          if (error) {
            result.errors.push(`Error al guardar: ${error.message}`)
          } else {
            result.imported = unique.length
            load()
          }
        }
      }

      setImportResult(result)
    } catch (err) {
      setImportResult({ total: 0, imported: 0, errors: [`Error al leer el archivo: ${String(err)}`] })
    } finally {
      setImporting(false)
    }
  }

  async function handleImportPDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const parsed = await parseMercadoPagoPDF(file)
      const result: ImportResult = { total: parsed.length, imported: 0, errors: [] }

      if (parsed.length === 0) {
        result.errors.push('No se encontraron transacciones en el PDF. Verificá que sea un resumen de Mercado Pago.')
        setImportResult(result)
        return
      }

      // Load categories cache
      const { data: existingCats } = await supabase
        .from('categories').select('id, name, type').eq('user_id', user.id)

      const catCache: Record<string, string> = {}
      for (const c of existingCats ?? []) {
        catCache[`${c.name.toLowerCase()}__${c.type}`] = c.id
      }

      const ensureCategory = async (name: string, type: 'ingreso' | 'gasto', color: string): Promise<string> => {
        const key = `${name.toLowerCase()}__${type}`
        if (catCache[key]) return catCache[key]
        const { data } = await supabase.from('categories')
          .insert({ user_id: user.id, name, type, color })
          .select('id').single()
        if (data?.id) catCache[key] = data.id
        return data?.id ?? ''
      }

      const toInsert: object[] = []
      for (const tx of parsed) {
        let category_id: string | null = null
        const guessed = guessCategory(tx.description)
        if (guessed) {
          category_id = await ensureCategory(guessed.category, tx.type, guessed.color) || null
        }
        toInsert.push({ user_id: user.id, date: tx.date, type: tx.type, amount: tx.amount, description: tx.description, category_id })
      }

      const dupIndexes = new Set(await filterDuplicates(supabase, toInsert as { date: string; description: string | null; type: string; amount: number }[]))
      const unique = toInsert.filter((_, i) => !dupIndexes.has(i))
      const skipped = toInsert.length - unique.length
      if (skipped > 0) result.errors.push(`${skipped} transacción(es) ya existían y fueron omitidas`)
      if (unique.length > 0) {
        const { error } = await supabase.from('transactions').insert(unique)
        if (error) {
          result.errors.push(`Error al guardar: ${error.message}`)
        } else {
          result.imported = unique.length
          load()
        }
      }

      setImportResult(result)
    } catch (err) {
      setImportResult({ total: 0, imported: 0, errors: [`Error al leer el PDF: ${String(err)}`] })
    } finally {
      setImporting(false)
    }
  }

  async function handleCleanDuplicates() {
    setCleaning(true)
    try {
      // Fetch all transactions for the user
      const { data: all } = await supabase
        .from('transactions')
        .select('id, date, description, type, amount')
        .order('created_at', { ascending: true }) // keep the oldest

      if (!all || all.length === 0) return

      const seen = new Set<string>()
      const toDelete: string[] = []

      for (const t of all) {
        const key = txKey(t.date, t.description, t.type, t.amount)
        if (seen.has(key)) {
          toDelete.push(t.id)
        } else {
          seen.add(key)
        }
      }

      if (toDelete.length === 0) {
        setCleanResult({ deleted: 0 })
        return
      }

      // Delete in batches of 50
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
      if (!res.ok) throw new Error(json.error || 'Error al procesar el comprobante')
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
      const { data: existingCat } = await supabase
        .from('categories').select('id').eq('user_id', user.id)
        .eq('name', guessed.category).eq('type', receiptPreview.type).maybeSingle()
      if (existingCat?.id) {
        category_id = existingCat.id
      } else {
        const { data: newCat } = await supabase.from('categories')
          .insert({ user_id: user.id, name: guessed.category, type: receiptPreview.type, color: guessed.color })
          .select('id').single()
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

  return (
    <div className={S.root}>
      {/* Header */}
      <div className={S.pageHeader}>
        <div>
          <h1 className={S.pageTitle}>Transacciones</h1>
          <div className={S.monthNav}>
            <button
              onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setPage(1) }}
              className={S.monthNavBtn}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={S.monthLabel}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button
              onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setPage(1) }}
              disabled={format(addMonths(currentMonth, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
              className={S.monthNavBtnDisabled}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {format(currentMonth, 'yyyy-MM') !== format(new Date(), 'yyyy-MM') && (
              <button
                onClick={() => { setCurrentMonth(startOfMonth(new Date())); setPage(1) }}
                className={S.todayBtn}
              >
                Hoy
              </button>
            )}
            <span className={S.totalCount}>
              · {total} transacción{total !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
        <div className={S.headerActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className={S.fileInputHidden}
            onChange={handleImportExcel}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className={S.fileInputHidden}
            onChange={handleImportPDF}
          />
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*"
            className={S.fileInputHidden}
            onChange={handleImportReceipt}
          />
          <button
            onClick={handleCleanDuplicates}
            disabled={cleaning || importing}
            className={S.btnDuplicates}
            title="Eliminar transacciones duplicadas"
          >
            <X className="w-4 h-4" />
            <span className={S.btnLabel}>{cleaning ? 'Limpiando...' : 'Duplicados'}</span>
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={cleaning || importing}
            className={S.btnClearAll}
            title="Eliminar todas las transacciones"
          >
            <Trash2 className="w-4 h-4" />
            <span className={S.btnLabel}>Limpiar</span>
          </button>

          {/* Import dropdown */}
          <div ref={importMenuRef} className={S.menuWrap}>
            <button
              onClick={() => { setShowImportMenu(v => !v); setShowExportMenu(false) }}
              disabled={importing || receiptParsing}
              className={S.btnImport}
            >
              <Upload className="w-4 h-4 text-yellow-400" />
              <span className={S.btnLabel}>{importing ? 'Importando...' : receiptParsing ? 'Analizando...' : 'Importar'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showImportMenu && (
              <div className={S.menuDropdown}>
                <button
                  onClick={() => { setShowImportMenu(false); fileInputRef.current?.click() }}
                  className={S.menuItem}
                >
                  <FileSpreadsheet className="w-4 h-4 text-yellow-400" />
                  Excel
                </button>
                <button
                  onClick={() => { setShowImportMenu(false); pdfInputRef.current?.click() }}
                  className={S.menuItem}
                >
                  <FileText className="w-4 h-4 text-red-400" />
                  PDF Mercado Pago
                </button>
                <button
                  onClick={() => { setShowImportMenu(false); receiptInputRef.current?.click() }}
                  className={S.menuItem}
                >
                  <Camera className="w-4 h-4 text-purple-400" />
                  Comprobante (OCR)
                </button>
              </div>
            )}
          </div>

          {/* Export dropdown */}
          <div ref={exportMenuRef} className={S.menuWrap}>
            <button
              onClick={() => { setShowExportMenu(v => !v); setShowImportMenu(false) }}
              className={S.btnExport}
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className={S.btnLabel}>Exportar</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showExportMenu && (
              <div className={S.menuDropdown}>
                <button
                  onClick={() => { setShowExportMenu(false); handleExportExcel() }}
                  className={S.menuItem}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Excel
                </button>
                <button
                  onClick={() => { setShowExportMenu(false); handleExportPDF() }}
                  className={S.menuItem}
                >
                  <FileText className="w-4 h-4 text-red-400" />
                  PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditTx(null); setShowForm(true) }}
            className={S.btnNew}
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={S.filtersRow}>
        <div className={S.searchWrap}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className={S.searchInput}
          />
        </div>
        <div className={S.filterGroup}>
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {(['all', 'ingreso', 'gasto'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setPage(1) }}
              className={`${S.filterBtnBase} ${
                filterType === type
                  ? type === 'ingreso'
                    ? S.filterBtnIngreso
                    : type === 'gasto'
                    ? S.filterBtnGasto
                    : S.filterBtnAll
                  : S.filterBtnInactive
              }`}
            >
              {type === 'all' ? 'Todos' : type === 'ingreso' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}

          {/* Category filter dropdown */}
          <div className={S.catFilterWrap}>
            <button
              onClick={() => setCatDropdownOpen(o => !o)}
              className={filterCategory !== 'all' ? S.catFilterBtnActive : S.catFilterBtnInactive}
            >
              <Tag className="w-3.5 h-3.5" />
              {filterCategory === 'all'
                ? 'Categoría'
                : filterCategory === 'none'
                ? 'Sin categoría'
                : allCategories.find(c => c.id === filterCategory)?.name ?? 'Categoría'}
              <ChevronDown className="w-3 h-3" />
            </button>

            {catDropdownOpen && (
              <div className={S.catDropdown}>
                <div className={S.catDropdownInner}>
                  <button
                    onClick={() => { setFilterCategory('all'); setPage(1); setCatDropdownOpen(false) }}
                    className={filterCategory === 'all' ? S.catDropdownItemActive : S.catDropdownItemInactive}
                  >
                    Todas las categorías
                  </button>
                  <button
                    onClick={() => { setFilterCategory('none'); setPage(1); setCatDropdownOpen(false) }}
                    className={filterCategory === 'none' ? S.catDropdownItemActive : S.catDropdownItemInactive}
                  >
                    <div className={S.catDropdownDot} />
                    Sin categoría
                  </button>
                  <div className={S.catDropdownDivider} />
                  {allCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setFilterCategory(cat.id); setPage(1); setCatDropdownOpen(false) }}
                      className={filterCategory === cat.id ? S.catDropdownItemActive : S.catDropdownItemInactive}
                    >
                      <div className={S.catDropdownColorDot} style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={S.tableWrap}>
        <div className={S.tableScroll}>
          <table className={S.table}>
            <thead>
              <tr className={S.thead}>
                <th className={S.th}>
                  <button
                    onClick={() => { setSortDesc(!sortDesc); setPage(1) }}
                    className={S.thSortBtn}
                  >
                    Fecha <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className={S.th}>Tipo</th>
                <th className={S.th}>Categoría</th>
                <th className={S.th}>Descripción</th>
                <th className={S.thRight}>Monto</th>
                <th className={S.thRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={S.trLoading}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className={S.tdLoading}>
                        <div className={S.skeletonCell} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr className={S.trEmpty}>
                  <td colSpan={6} className={S.tdEmpty}>
                    {search || filterType !== 'all'
                      ? 'No se encontraron transacciones con ese filtro'
                      : 'No hay transacciones aún. ¡Crea la primera!'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className={S.trData}>
                    <td className={S.tdDate}>
                      {format(new Date(tx.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className={S.tdType}>
                      <span className={tx.type === 'ingreso' ? S.typeBadgeIngreso : S.typeBadgeGasto}>
                        {tx.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className={S.tdCategory}>
                      {tx.category ? (
                        <div className={S.catCellRow}>
                          <div className={S.catCellDot} style={{ backgroundColor: tx.category.color }} />
                          <span className={S.catCellName}>{tx.category.name}</span>
                        </div>
                      ) : (
                        <div className={S.noCatWrap}>
                          {savingCatTx === tx.id ? (
                            <div className={S.noCatSpinner}>
                              <svg className="w-3.5 h-3.5 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                              </svg>
                            </div>
                          ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setQuickCatTx(quickCatTx === tx.id ? null : tx.id) }}
                            className={S.noCatBtn}
                          >
                            Categoría
                          </button>
                          )}
                          {quickCatTx === tx.id && (
                            <div className={S.quickCatDropdown}>
                              <div className={S.quickCatInner}>
                                {allCategories
                                  .filter(c => c.type === tx.type)
                                  .map(cat => (
                                    <button
                                      key={cat.id}
                                      onClick={(e) => { e.stopPropagation(); handleQuickCategory(tx.id, cat.id) }}
                                      className={S.quickCatItem}
                                    >
                                      <div className={S.quickCatDot} style={{ backgroundColor: cat.color }} />
                                      {cat.name}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={S.tdDesc}>
                      {tx.description || <span className={S.tdDescEmpty}>—</span>}
                    </td>
                    <td className={S.tdAmount}>
                      <span className={tx.type === 'ingreso' ? S.amountIngreso : S.amountGasto}>
                        {tx.type === 'ingreso' ? '+' : '-'}
                        {formatAmount(Number(tx.amount), tx.currency ?? 'ARS')}
                      </span>
                      <span className={(tx.currency ?? 'ARS') === 'USD' ? S.currencyBadgeUsd : S.currencyBadgeArs}>
                        {tx.currency ?? 'ARS'}
                      </span>
                    </td>
                    <td className={S.tdActions}>
                      <div className={S.actionsWrap}>
                        <button
                          onClick={() => handleEdit(tx)}
                          className={S.editBtn}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === tx.id ? (
                          <div className={S.deleteConfirmWrap}>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className={S.deleteConfirmYes}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className={S.deleteConfirmNo}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(tx.id)}
                            className={S.deleteBtn}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={S.pagination}>
            <p className={S.paginationInfo}>
              Mostrando {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className={S.paginationControls}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={S.paginationBtn}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={S.paginationLabel}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={S.paginationBtn}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <TransactionForm
          transaction={editTx}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditTx(null) }}
        />
      )}

      {/* Import result modal */}
      {importResult && (
        <div className={S.modalOverlay}>
          <div className={S.modalBox}>
            <div className={S.modalHeader}>
              <h3 className={S.modalTitle}>Resultado de importación</h3>
              <button onClick={() => setImportResult(null)} className={S.modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={S.importResultRow}>
              {importResult.imported > 0 ? (
                <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className={S.importResultText}>
                  {cleaning
                    ? `${importResult.imported} duplicados eliminados`
                    : `${importResult.imported} de ${importResult.total} transacciones importadas`}
                </p>
                {importResult.errors.length > 0 && (
                  <p className={S.importResultSub}>{importResult.errors[0]}</p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className={S.importErrorBox}>
                <p className={S.importErrorLabel}>Errores:</p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className={S.importErrorItem}>• {err}</p>
                ))}
              </div>
            )}

            <p className={S.importTip}>
              Tip:{' '}
              <button onClick={downloadTemplate} className="underline hover:text-gray-300 transition-colors">
                descargá la plantilla
              </button>{' '}
              para ver el formato correcto.
            </p>

            <button
              onClick={() => setImportResult(null)}
              className={S.importCloseBtn}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Receipt preview modal */}
      {receiptPreview && (
        <div className={S.modalOverlay}>
          <div className={S.modalBox}>
            <div className={S.modalHeader}>
              <h3 className={S.receiptTitle}>
                <Camera className="w-5 h-5 text-purple-400" />
                Comprobante detectado
              </h3>
              <button onClick={() => setReceiptPreview(null)} className={S.modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={S.receiptRows}>
              <div className={S.receiptRow}>
                <span className={S.receiptLabel}>Fecha</span>
                <input
                  type="date"
                  value={receiptPreview.date}
                  onChange={e => setReceiptPreview(p => p ? { ...p, date: e.target.value } : p)}
                  className={S.receiptDateInput}
                />
              </div>
              <div className={S.receiptRow}>
                <span className={S.receiptLabel}>Descripción</span>
                <input
                  type="text"
                  value={receiptPreview.description}
                  onChange={e => setReceiptPreview(p => p ? { ...p, description: e.target.value } : p)}
                  className={S.receiptDescInput}
                />
              </div>
              <div className={S.receiptRow}>
                <span className={S.receiptLabel}>Monto</span>
                <input
                  type="number"
                  value={receiptPreview.amount}
                  onChange={e => setReceiptPreview(p => p ? { ...p, amount: Number(e.target.value) } : p)}
                  className={S.receiptAmountInput}
                />
              </div>
              <div className={S.receiptTypeRow}>
                <span className={S.receiptLabel}>Tipo</span>
                <div className={S.receiptTypeButtons}>
                  {(['gasto', 'ingreso'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setReceiptPreview(p => p ? { ...p, type: t } : p)}
                      className={
                        receiptPreview.type === t
                          ? t === 'gasto' ? S.receiptTypeBtnGastoActive : S.receiptTypeBtnIngresoActive
                          : S.receiptTypeBtnInactive
                      }
                    >
                      {t === 'gasto' ? 'Gasto' : 'Ingreso'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={S.receiptActions}>
              <button
                onClick={() => setReceiptPreview(null)}
                className={S.receiptCancelBtn}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReceipt}
                className={S.receiptConfirmBtn}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear all confirmation modal */}
      {showClearConfirm && (
        <div className={S.modalOverlay}>
          <div className={S.cleanModalBox}>
            <div className={S.clearAllIcon}>
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <h3 className={S.cleanTitle}>¿Seguro querés eliminar las transacciones?</h3>
            <p className={S.cleanText}>Esta acción no se puede deshacer. Se eliminarán <strong className="text-white">todas</strong> las transacciones.</p>
            <div className={S.clearAllActions}>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className={S.clearAllCancelBtn}
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className={S.clearAllConfirmBtn}
              >
                {clearing ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean duplicates result modal */}
      {cleanResult !== null && (
        <div className={S.modalOverlay}>
          <div className={S.cleanModalBox}>
            {cleanResult.deleted > 0 ? (
              <>
                <div className={S.cleanSuccessIcon}>
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className={S.cleanTitle}>¡Listo!</h3>
                <p className={S.cleanText}>
                  Se eliminaron <span className="text-white font-semibold">{cleanResult.deleted}</span> transacciones duplicadas correctamente.
                </p>
              </>
            ) : (
              <>
                <div className={S.cleanNoneIcon}>
                  <CheckCircle className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className={S.cleanTitle}>Sin duplicados</h3>
                <p className={S.cleanText}>No se encontraron transacciones duplicadas.</p>
              </>
            )}
            <button
              onClick={() => setCleanResult(null)}
              className={S.cleanOkBtn}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TransaccionesPage() {
  return (
    <Suspense>
      <TransaccionesPageInner />
    </Suspense>
  )
}
