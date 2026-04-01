'use client'

import { BarLineChart, PieChartComponent } from '@/components/ui/ExpenseChart'
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
import { ClassNames } from './page.styles'
import { useLang } from '@/lib/i18n/LangContext'
import { useReportes } from '@/LogicService/secciones/reportes/useReportes'

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function ReportesSection() {
  const { t } = useLang()
  const {
    loading,
    chartType, setChartType,
    monthsToShow, setMonthsToShow,
    pieCategory, setPieCategory,
    monthlyData,
    pieData,
    totalIngresos,
    totalGastos,
    balance,
    savingsRate,
    handleExportExcel,
    handleExportPDF,
  } = useReportes()

  return (
    <div className={ClassNames.root}>
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>{t.reports.title}</h1>
          <p className={ClassNames.pageSub}>{t.reports.sub(monthsToShow)}</p>
        </div>
        <div className={ClassNames.headerActions}>
          <button onClick={handleExportExcel} className={ClassNames.exportBtn}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className={ClassNames.exportBtnLabel}>Excel</span>
          </button>
          <button onClick={handleExportPDF} className={ClassNames.exportBtn}>
            <FileText className="w-4 h-4 text-red-400" />
            <span className={ClassNames.exportBtnLabel}>PDF</span>
          </button>
        </div>
      </div>

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

      <div className={ClassNames.chartCard}>
        <div className={ClassNames.chartHeader}>
          <h3 className={ClassNames.chartTitle}>{t.reports.chartTitle}</h3>
          <div className={ClassNames.chartControls}>
            <select
              value={monthsToShow}
              onChange={(e) => setMonthsToShow(Number(e.target.value))}
              className={ClassNames.monthsSelect}
            >
              <option value={3}>{t.reports.months3}</option>
              <option value={6}>{t.reports.months6}</option>
              <option value={12}>{t.reports.months12}</option>
            </select>

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

      <div className={ClassNames.bottomGrid}>
        <div className={ClassNames.pieCard}>
          <div className={ClassNames.pieHeader}>
            <div className={ClassNames.pieHeaderLeft}>
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold">
                {pieCategory === 'gasto' ? t.reports.pieExpenses : t.reports.pieIncome}
              </h3>
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
