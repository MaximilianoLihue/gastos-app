'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, MonthlyData, CategoryData } from '@/lib/types'
import { BarLineChart, PieChartComponent } from '@/components/ExpenseChart'
import { exportToExcel, exportToPDF } from '@/lib/export'
import {
  BarChart3,
  LineChart,
  PieChart,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ReportesPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [monthsToShow, setMonthsToShow] = useState(6)
  const [pieCategory, setPieCategory] = useState<'gasto' | 'ingreso'>('gasto')

  const load = useCallback(async () => {
    setLoading(true)
    const from = format(startOfMonth(subMonths(new Date(), monthsToShow - 1)), 'yyyy-MM-dd')
    const to = format(endOfMonth(new Date()), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(name, color, type)')
      .gte('date', from)
      .lte('date', to)
      .order('date')

    setTransactions((data as Transaction[]) ?? [])
    setLoading(false)
  }, [monthsToShow])

  useEffect(() => {
    load()
  }, [load])

  // Build monthly data
  const monthlyData: MonthlyData[] = []
  const now = new Date()

  for (let i = monthsToShow - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthKey = format(monthDate, 'yyyy-MM')
    const monthLabel = format(monthDate, 'MMM yy', { locale: es })

    const monthTxs = transactions.filter(
      (t) => t.date.substring(0, 7) === monthKey
    )

    const ingresos = monthTxs
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const gastos = monthTxs
      .filter((t) => t.type === 'gasto')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    monthlyData.push({
      month: monthLabel,
      ingresos,
      gastos,
    })
  }

  // Build category pie data
  const categoryMap = new Map<string, { value: number; color: string }>()
  transactions
    .filter((t) => t.type === pieCategory && t.category)
    .forEach((t) => {
      const key = t.category!.name
      const existing = categoryMap.get(key)
      if (existing) {
        existing.value += Number(t.amount)
      } else {
        categoryMap.set(key, {
          value: Number(t.amount),
          color: t.category!.color,
        })
      }
    })

  const pieData: CategoryData[] = Array.from(categoryMap.entries())
    .map(([name, { value, color }]) => ({ name, value, color }))
    .sort((a, b) => b.value - a.value)

  // Overall stats
  const totalIngresos = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalGastos = transactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIngresos - totalGastos
  const savingsRate =
    totalIngresos > 0
      ? Math.max(0, ((totalIngresos - totalGastos) / totalIngresos) * 100)
      : 0

  // Best and worst month
  const bestMonth = [...monthlyData].sort(
    (a, b) => b.ingresos - b.gastos - (a.ingresos - a.gastos)
  )[0]
  const worstMonth = [...monthlyData].sort(
    (a, b) => a.ingresos - a.gastos - (b.ingresos - b.gastos)
  )[0]

  async function handleExportExcel() {
    exportToExcel(transactions, `reporte_${monthsToShow}meses`)
  }

  async function handleExportPDF() {
    exportToPDF(
      transactions,
      { totalIngresos, totalGastos, balance },
      `Últimos ${monthsToShow} meses`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Reportes</h1>
          <p className="text-gray-400 text-sm mt-1">
            Análisis de los últimos {monthsToShow} meses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 text-sm transition-colors"
          >
            <FileText className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-gray-400 text-xs">Total Ingresos</p>
          <p className="text-emerald-400 font-bold text-lg mt-0.5">{formatARS(totalIngresos)}</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-gray-400 text-xs">Total Gastos</p>
          <p className="text-red-400 font-bold text-lg mt-0.5">{formatARS(totalGastos)}</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-gray-400 text-xs">Balance</p>
          <p className={`font-bold text-lg mt-0.5 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {formatARS(balance)}
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-gray-400 text-xs">Tasa de ahorro</p>
          <p className="text-amber-400 font-bold text-lg mt-0.5">{savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Main chart */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-white font-semibold">Ingresos vs Gastos por Mes</h3>
          <div className="flex items-center gap-2">
            {/* Months selector */}
            <select
              value={monthsToShow}
              onChange={(e) => setMonthsToShow(Number(e.target.value))}
              className="px-3 py-1.5 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>

            {/* Chart type toggle */}
            <div className="flex bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md transition-colors ${
                  chartType === 'bar'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Barras"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-1.5 rounded-md transition-colors ${
                  chartType === 'line'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Líneas"
              >
                <LineChart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <BarLineChart data={monthlyData} chartType={chartType} />
        )}
      </div>

      {/* Pie chart + best/worst months */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold">Por categoría</h3>
            </div>
            <div className="flex bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setPieCategory('gasto')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  pieCategory === 'gasto'
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setPieCategory('ingreso')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  pieCategory === 'ingreso'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Ingresos
              </button>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <PieChartComponent data={pieData} />
          )}
        </div>

        {/* Monthly summary */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5">Resumen mensual</h3>
          <div className="space-y-3">
            {monthlyData.map((m) => {
              const monthBalance = m.ingresos - m.gastos
              const pct =
                m.ingresos > 0
                  ? Math.min(Math.round((m.gastos / m.ingresos) * 100), 100)
                  : m.gastos > 0
                  ? 100
                  : 0

              return (
                <div key={m.month}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm capitalize">{m.month}</span>
                    <span
                      className={`text-sm font-medium ${
                        monthBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {monthBalance >= 0 ? '+' : ''}{formatARS(monthBalance)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-gray-600 text-xs">{formatARS(m.gastos)} gastos</span>
                    <span className="text-gray-600 text-xs">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
