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
import { S } from './page.styles'

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
    <div className={S.root}>
      {/* Header */}
      <div className={S.pageHeader}>
        <div>
          <h1 className={S.pageTitle}>Reportes</h1>
          <p className={S.pageSub}>
            Análisis de los últimos {monthsToShow} meses
          </p>
        </div>
        <div className={S.headerActions}>
          <button
            onClick={handleExportExcel}
            className={S.exportBtn}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className={S.exportBtnLabel}>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className={S.exportBtn}
          >
            <FileText className="w-4 h-4 text-red-400" />
            <span className={S.exportBtnLabel}>PDF</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className={S.summaryGrid}>
        <div className={S.summaryCard}>
          <div className={S.summaryIconIngreso}>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={S.summaryLabel}>Total Ingresos</p>
          <p className={S.summaryValueIngreso}>{formatARS(totalIngresos)}</p>
        </div>

        <div className={S.summaryCard}>
          <div className={S.summaryIconGasto}>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className={S.summaryLabel}>Total Gastos</p>
          <p className={S.summaryValueGasto}>{formatARS(totalGastos)}</p>
        </div>

        <div className={S.summaryCard}>
          <div className={S.summaryIconBlue}>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <p className={S.summaryLabel}>Balance</p>
          <p className={balance >= 0 ? S.summaryValueBalancePos : S.summaryValueBalanceNeg}>
            {formatARS(balance)}
          </p>
        </div>

        <div className={S.summaryCard}>
          <div className={S.summaryIconAmber}>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className={S.summaryLabel}>Tasa de ahorro</p>
          <p className={S.summaryValueAmber}>{savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Main chart */}
      <div className={S.chartCard}>
        <div className={S.chartHeader}>
          <h3 className={S.chartTitle}>Ingresos vs Gastos por Mes</h3>
          <div className={S.chartControls}>
            {/* Months selector */}
            <select
              value={monthsToShow}
              onChange={(e) => setMonthsToShow(Number(e.target.value))}
              className={S.monthsSelect}
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>

            {/* Chart type toggle */}
            <div className={S.chartTypeTabs}>
              <button
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' ? S.chartTypeBtnActive : S.chartTypeBtnInactive}
                title="Barras"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? S.chartTypeBtnActive : S.chartTypeBtnInactive}
                title="Líneas"
              >
                <LineChart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={S.chartLoading}>
            <div className={S.spinner} />
          </div>
        ) : (
          <BarLineChart data={monthlyData} chartType={chartType} />
        )}
      </div>

      {/* Pie chart + best/worst months */}
      <div className={S.bottomGrid}>
        {/* Pie */}
        <div className={S.pieCard}>
          <div className={S.pieHeader}>
            <div className={S.pieHeaderLeft}>
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold">Por categoría</h3>
            </div>
            <div className={S.pieTabs}>
              <button
                onClick={() => setPieCategory('gasto')}
                className={pieCategory === 'gasto' ? S.pieBtnGastoActive : S.pieBtnInactive}
              >
                Gastos
              </button>
              <button
                onClick={() => setPieCategory('ingreso')}
                className={pieCategory === 'ingreso' ? S.pieBtnIngresoActive : S.pieBtnInactive}
              >
                Ingresos
              </button>
            </div>
          </div>
          {loading ? (
            <div className={S.pieLoading}>
              <div className={S.spinner} />
            </div>
          ) : (
            <PieChartComponent data={pieData} />
          )}
        </div>

        {/* Monthly summary */}
        <div className={S.monthlyCard}>
          <h3 className={S.monthlyTitle}>Resumen mensual</h3>
          <div className={S.monthlyList}>
            {monthlyData.map((m) => {
              const monthBalance = m.ingresos - m.gastos
              const pct =
                m.ingresos > 0
                  ? Math.min(Math.round((m.gastos / m.ingresos) * 100), 100)
                  : m.gastos > 0
                  ? 100
                  : 0

              return (
                <div key={m.month} className={S.monthlyRow}>
                  <div className={S.monthlyMeta}>
                    <span className={S.monthlyLabel}>{m.month}</span>
                    <span className={monthBalance >= 0 ? S.monthlyBalancePos : S.monthlyBalanceNeg}>
                      {monthBalance >= 0 ? '+' : ''}{formatARS(monthBalance)}
                    </span>
                  </div>
                  <div className={S.monthlyBar}>
                    <div
                      className={pct >= 100 ? S.monthlyFillBad : pct >= 80 ? S.monthlyFillWarn : S.monthlyFillGood}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={S.monthlySubRow}>
                    <span className={S.monthlySubText}>{formatARS(m.gastos)} gastos</span>
                    <span className={S.monthlySubText}>{pct}%</span>
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
