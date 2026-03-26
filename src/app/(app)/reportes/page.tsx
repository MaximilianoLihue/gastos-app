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
import { es, enUS } from 'date-fns/locale'
import { ClassNames } from './page.styles'
import { useLang } from '@/lib/i18n/LangContext'

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
  const { t, lang } = useLang()
  const dateLocale = lang === 'en' ? enUS : es
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
    const monthLabel = format(monthDate, 'MMM yy', { locale: dateLocale })

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
      t.reports.exportPdfLabel(monthsToShow)
    )
  }

  return (
    <div className={ClassNames.root}>
      {/* Header */}
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>{t.reports.title}</h1>
          <p className={ClassNames.pageSub}>
            {t.reports.sub(monthsToShow)}
          </p>
        </div>
        <div className={ClassNames.headerActions}>
          <button
            onClick={handleExportExcel}
            className={ClassNames.exportBtn}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className={ClassNames.exportBtnLabel}>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className={ClassNames.exportBtn}
          >
            <FileText className="w-4 h-4 text-red-400" />
            <span className={ClassNames.exportBtnLabel}>PDF</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className={ClassNames.summaryGrid}>
        <div className={ClassNames.summaryCard}>
          <div className={ClassNames.summaryIconIngreso}>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={ClassNames.summaryLabel}>{t.reports.totalIncome}</p>
          <p className={ClassNames.summaryValueIngreso}>{formatARS(totalIngresos)}</p>
        </div>

        <div className={ClassNames.summaryCard}>
          <div className={ClassNames.summaryIconGasto}>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className={ClassNames.summaryLabel}>{t.reports.totalExpenses}</p>
          <p className={ClassNames.summaryValueGasto}>{formatARS(totalGastos)}</p>
        </div>

        <div className={ClassNames.summaryCard}>
          <div className={ClassNames.summaryIconBlue}>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <p className={ClassNames.summaryLabel}>{t.common.balance}</p>
          <p className={balance >= 0 ? ClassNames.summaryValueBalancePos : ClassNames.summaryValueBalanceNeg}>
            {formatARS(balance)}
          </p>
        </div>

        <div className={ClassNames.summaryCard}>
          <div className={ClassNames.summaryIconAmber}>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className={ClassNames.summaryLabel}>{t.reports.savingsRate}</p>
          <p className={ClassNames.summaryValueAmber}>{savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Main chart */}
      <div className={ClassNames.chartCard}>
        <div className={ClassNames.chartHeader}>
          <h3 className={ClassNames.chartTitle}>{t.reports.chartTitle}</h3>
          <div className={ClassNames.chartControls}>
            {/* Months selector */}
            <select
              value={monthsToShow}
              onChange={(e) => setMonthsToShow(Number(e.target.value))}
              className={ClassNames.monthsSelect}
            >
              <option value={3}>{t.reports.months3}</option>
              <option value={6}>{t.reports.months6}</option>
              <option value={12}>{t.reports.months12}</option>
            </select>

            {/* Chart type toggle */}
            <div className={ClassNames.chartTypeTabs}>
              <button
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' ? ClassNames.chartTypeBtnActive : ClassNames.chartTypeBtnInactive}
                title={t.reports.barChart}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? ClassNames.chartTypeBtnActive : ClassNames.chartTypeBtnInactive}
                title={t.reports.lineChart}
              >
                <LineChart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={ClassNames.chartLoading}>
            <div className={ClassNames.spinner} />
          </div>
        ) : (
          <BarLineChart data={monthlyData} chartType={chartType} />
        )}
      </div>

      {/* Pie chart + best/worst months */}
      <div className={ClassNames.bottomGrid}>
        {/* Pie */}
        <div className={ClassNames.pieCard}>
          <div className={ClassNames.pieHeader}>
            <div className={ClassNames.pieHeaderLeft}>
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold">{pieCategory === 'gasto' ? t.reports.pieExpenses : t.reports.pieIncome}</h3>
            </div>
            <div className={ClassNames.pieTabs}>
              <button
                onClick={() => setPieCategory('gasto')}
                className={pieCategory === 'gasto' ? ClassNames.pieBtnGastoActive : ClassNames.pieBtnInactive}
              >
                {t.common.expenses}
              </button>
              <button
                onClick={() => setPieCategory('ingreso')}
                className={pieCategory === 'ingreso' ? ClassNames.pieBtnIngresoActive : ClassNames.pieBtnInactive}
              >
                {t.common.incomes}
              </button>
            </div>
          </div>
          {loading ? (
            <div className={ClassNames.pieLoading}>
              <div className={ClassNames.spinner} />
            </div>
          ) : (
            <PieChartComponent data={pieData} />
          )}
        </div>

        {/* Monthly summary */}
        <div className={ClassNames.monthlyCard}>
          <h3 className={ClassNames.monthlyTitle}>{t.reports.monthlySummary}</h3>
          <div className={ClassNames.monthlyList}>
            {monthlyData.map((m) => {
              const monthBalance = m.ingresos - m.gastos
              const pct =
                m.ingresos > 0
                  ? Math.min(Math.round((m.gastos / m.ingresos) * 100), 100)
                  : m.gastos > 0
                  ? 100
                  : 0

              return (
                <div key={m.month} className={ClassNames.monthlyRow}>
                  <div className={ClassNames.monthlyMeta}>
                    <span className={ClassNames.monthlyLabel}>{m.month}</span>
                    <span className={monthBalance >= 0 ? ClassNames.monthlyBalancePos : ClassNames.monthlyBalanceNeg}>
                      {monthBalance >= 0 ? '+' : ''}{formatARS(monthBalance)}
                    </span>
                  </div>
                  <div className={ClassNames.monthlyBar}>
                    <div
                      className={pct >= 100 ? ClassNames.monthlyFillBad : pct >= 80 ? ClassNames.monthlyFillWarn : ClassNames.monthlyFillGood}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={ClassNames.monthlySubRow}>
                    <span className={ClassNames.monthlySubText}>{formatARS(m.gastos)} {t.common.expenses.toLowerCase()}</span>
                    <span className={ClassNames.monthlySubText}>{pct}%</span>
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
