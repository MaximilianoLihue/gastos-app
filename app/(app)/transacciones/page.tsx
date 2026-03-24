'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/lib/types'
import TransactionForm from '@/components/TransactionForm'
import { exportToExcel, exportToPDF } from '@/lib/export'
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
  ArrowUpDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const PAGE_SIZE = 15

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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

    query = query
      .order('date', { ascending: !sortDesc })
      .order('created_at', { ascending: !sortDesc })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    const { data, count } = await query
    setTransactions((data as Transaction[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [filterType, search, page, sortDesc])

  useEffect(() => {
    load()
  }, [load])

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

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Transacciones</h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} transacción{total !== 1 ? 'es' : ''} en total
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
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
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tx.category.color }}
                          />
                          <span className="text-gray-300 text-sm">{tx.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
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
    </div>
  )
}
