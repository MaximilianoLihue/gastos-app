'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, MonthlyData, CategoryData } from '@/lib/types'
import { exportToExcel, exportToPDF } from '@/LogicService/secciones/transacciones/exportService'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useLang } from '@/lib/i18n/LangContext'

export function useReportes() {
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

  useEffect(() => { load() }, [load])

  // Monthly chart data
  const now = new Date()
  const monthlyData: MonthlyData[] = []

  for (let i = monthsToShow - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthKey = format(monthDate, 'yyyy-MM')
    const monthLabel = format(monthDate, 'MMM yy', { locale: dateLocale })

    const monthTxs = transactions.filter(tx => tx.date.substring(0, 7) === monthKey)
    const ingresos = monthTxs.filter(tx => tx.type === 'ingreso').reduce((sum, tx) => sum + Number(tx.amount), 0)
    const gastos = monthTxs.filter(tx => tx.type === 'gasto').reduce((sum, tx) => sum + Number(tx.amount), 0)

    monthlyData.push({ month: monthLabel, ingresos, gastos })
  }

  // Pie chart data
  const categoryMap = new Map<string, { value: number; color: string }>()
  transactions
    .filter(tx => tx.type === pieCategory && tx.category)
    .forEach(tx => {
      const key = tx.category!.name
      const existing = categoryMap.get(key)
      if (existing) {
        existing.value += Number(tx.amount)
      } else {
        categoryMap.set(key, { value: Number(tx.amount), color: tx.category!.color })
      }
    })

  const pieData: CategoryData[] = Array.from(categoryMap.entries())
    .map(([name, { value, color }]) => ({ name, value, color }))
    .sort((a, b) => b.value - a.value)

  // Summary stats
  const totalIngresos = transactions.filter(tx => tx.type === 'ingreso').reduce((sum, tx) => sum + Number(tx.amount), 0)
  const totalGastos = transactions.filter(tx => tx.type === 'gasto').reduce((sum, tx) => sum + Number(tx.amount), 0)
  const balance = totalIngresos - totalGastos
  const savingsRate = totalIngresos > 0 ? Math.max(0, ((totalIngresos - totalGastos) / totalIngresos) * 100) : 0

  function handleExportExcel() {
    exportToExcel(transactions, `reporte_${monthsToShow}meses`)
  }

  function handleExportPDF() {
    exportToPDF(
      transactions,
      { totalIngresos, totalGastos, balance },
      t.reports.exportPdfLabel(monthsToShow)
    )
  }

  return {
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
  }
}
