'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
} from 'lucide-react'
import { format, parse, isValid, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'

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

export default function TransaccionesPage() {
  const supabase = createClient()
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
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
    if (!catDropdownOpen) return
    const close = () => setCatDropdownOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [catDropdownOpen])

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

          toInsert.push({ user_id: user.id, date, type, amount, description, category_id })
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
              const key = `${guessed.category.toLowerCase()}__${type}`
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

          toInsert.push({ user_id: user.id, date, type, amount, description, category_id })
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

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Transacciones</h1>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setPage(1) }}
              className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-emerald-400 text-sm font-medium capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button
              onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setPage(1) }}
              disabled={format(addMonths(currentMonth, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
              className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {format(currentMonth, 'yyyy-MM') !== format(new Date(), 'yyyy-MM') && (
              <button
                onClick={() => { setCurrentMonth(startOfMonth(new Date())); setPage(1) }}
                className="text-xs text-gray-500 hover:text-emerald-400 transition-colors ml-1"
              >
                Hoy
              </button>
            )}
            <span className="text-gray-600 text-xs ml-1">
              · {total} transacción{total !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportExcel}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleImportPDF}
          />
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm transition-colors"
            title="Descargar plantilla Excel"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Plantilla</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm transition-colors disabled:opacity-50"
            title="Importar desde Excel"
          >
            <Upload className="w-4 h-4 text-yellow-400" />
            <span className="hidden sm:inline">{importing ? 'Importando...' : 'Excel'}</span>
          </button>
          <button
            onClick={() => pdfInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm transition-colors disabled:opacity-50"
            title="Importar PDF Mercado Pago"
          >
            <Upload className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">{importing ? 'Importando...' : 'PDF MP'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm transition-colors"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm transition-colors"
            title="Exportar a PDF"
          >
            <FileText className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => { setEditTx(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {(['all', 'ingreso', 'gasto'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setPage(1) }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                filterType === type
                  ? type === 'ingreso'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : type === 'gasto'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-gray-700 text-white border border-gray-600'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              {type === 'all' ? 'Todos' : type === 'ingreso' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}

          {/* Category filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setCatDropdownOpen(o => !o)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                filterCategory !== 'all'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'text-gray-400 hover:text-white border-transparent hover:border-gray-600'
              }`}
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
              <div className="absolute z-20 top-10 right-0 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="p-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setFilterCategory('all'); setPage(1); setCatDropdownOpen(false) }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${filterCategory === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  >
                    Todas las categorías
                  </button>
                  <button
                    onClick={() => { setFilterCategory('none'); setPage(1); setCatDropdownOpen(false) }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${filterCategory === 'none' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-600 flex-shrink-0" />
                    Sin categoría
                  </button>
                  <div className="my-1 border-t border-gray-700" />
                  {allCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setFilterCategory(cat.id); setPage(1); setCatDropdownOpen(false) }}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${filterCategory === cat.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
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
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => { setSortDesc(!sortDesc); setPage(1) }}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Fecha <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Categoría
                </th>
                <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Descripción
                </th>
                <th className="text-right px-4 py-3 text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Monto
                </th>
                <th className="text-right px-4 py-3 text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-700/30">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    {search || filterType !== 'all'
                      ? 'No se encontraron transacciones con ese filtro'
                      : 'No hay transacciones aún. ¡Crea la primera!'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                      {format(new Date(tx.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                          tx.type === 'ingreso'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {tx.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tx.category ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tx.category.color }} />
                          <span className="text-gray-300 text-sm">{tx.category.name}</span>
                        </div>
                      ) : (
                        <div className="relative">
                          {savingCatTx === tx.id ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500">
                              <svg className="w-3.5 h-3.5 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                              </svg>
                            </div>
                          ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setQuickCatTx(quickCatTx === tx.id ? null : tx.id) }}
                            className="px-2 py-1 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-emerald-500 hover:text-emerald-400 transition-colors text-xs"
                          >
                            Categoría
                          </button>
                          )}
                          {quickCatTx === tx.id && (
                            <div className="absolute z-20 top-8 left-0 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                              <div className="p-1 max-h-52 overflow-y-auto">
                                {allCategories
                                  .filter(c => c.type === tx.type)
                                  .map(cat => (
                                    <button
                                      key={cat.id}
                                      onClick={(e) => { e.stopPropagation(); handleQuickCategory(tx.id, cat.id) }}
                                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-gray-700 text-left text-sm text-gray-300 hover:text-white transition-colors"
                                    >
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                      {cat.name}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>

                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm max-w-[200px] truncate">
                      {tx.description || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold text-sm ${
                          tx.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'ingreso' ? '+' : '-'}
                        {formatARS(Number(tx.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === tx.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded-md text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(tx.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
            <p className="text-gray-500 text-sm">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-400 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Resultado de importación</h3>
              <button onClick={() => setImportResult(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-700/50 mb-4">
              {importResult.imported > 0 ? (
                <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className="text-white font-medium">
                  {importResult.imported} de {importResult.total} transacciones importadas
                </p>
                {importResult.errors.length > 0 && (
                  <p className="text-gray-400 text-sm">{importResult.errors.length} filas con errores</p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="text-red-400 text-xs font-medium mb-2">Errores:</p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-red-300 text-xs mb-1">• {err}</p>
                ))}
              </div>
            )}

            <p className="text-gray-500 text-xs mt-4">
              Tip: descargá la plantilla para ver el formato correcto.
            </p>

            <button
              onClick={() => setImportResult(null)}
              className="mt-4 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
