'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/lib/types'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useLang } from '@/lib/i18n/LangContext'

export interface CategoryTrend {
  name: string
  color: string
  prevAmount: number
  currAmount: number
  pctChange: number
}

export interface InflacionPoint {
  label: string
  valor: number
}

export function useTendencias() {
  const supabase = createClient()
  const { lang } = useLang()
  const dateLocale = lang === 'en' ? enUS : es

  const [loading, setLoading] = useState(true)
  const [inflacionLoading, setInflacionLoading] = useState(true)
  const [inflacionError, setInflacionError] = useState(false)

  const [currMonthTxs, setCurrMonthTxs] = useState<Transaction[]>([])
  const [prevMonthTxs, setPrevMonthTxs] = useState<Transaction[]>([])
  const [inflacionData, setInflacionData] = useState<InflacionPoint[]>([])
  const [lastInflacion, setLastInflacion] = useState<number | null>(null)
  const [acumuladoAnual, setAcumuladoAnual] = useState<number | null>(null)

  const now = new Date()
  const currMonth = startOfMonth(now)
  const prevMonth = startOfMonth(subMonths(now, 1))

  const currMonthLabel = format(currMonth, 'MMMM yyyy', { locale: dateLocale })
  const prevMonthLabel = format(prevMonth, 'MMMM yyyy', { locale: dateLocale })

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    const from = format(startOfMonth(prevMonth), 'yyyy-MM-dd')
    const to = format(endOfMonth(currMonth), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(name, color, type)')
      .gte('date', from)
      .lte('date', to)
      .eq('type', 'gasto')

    const txs = (data as Transaction[]) ?? []
    const currKey = format(currMonth, 'yyyy-MM')
    const prevKey = format(prevMonth, 'yyyy-MM')

    setCurrMonthTxs(txs.filter(tx => tx.date.substring(0, 7) === currKey))
    setPrevMonthTxs(txs.filter(tx => tx.date.substring(0, 7) === prevKey))
    setLoading(false)
  }, [])

  const loadInflacion = useCallback(async () => {
    setInflacionLoading(true)
    setInflacionError(false)
    try {
      const res = await fetch('/api/inflacion')
      if (!res.ok) throw new Error('fetch error')
      const raw: Array<{ fecha: string; valor: number }> = await res.json()
      if (!Array.isArray(raw)) throw new Error('invalid data')

      // Take last 12 months
      const sorted = [...raw].sort((a, b) => a.fecha.localeCompare(b.fecha))
      const last12 = sorted.slice(-12)

      const points: InflacionPoint[] = last12.map(item => ({
        label: format(new Date(item.fecha + 'T12:00:00'), 'MMM yy', { locale: dateLocale }),
        valor: item.valor,
      }))
      setInflacionData(points)

      const lastVal = last12[last12.length - 1]?.valor ?? null
      setLastInflacion(lastVal)

      // Accumulated: compound formula (1+r1)*(1+r2)*...-1
      const accumulated = last12.reduce((acc, item) => acc * (1 + item.valor / 100), 1) - 1
      setAcumuladoAnual(accumulated * 100)
    } catch {
      setInflacionError(true)
    } finally {
      setInflacionLoading(false)
    }
  }, [lang])

  useEffect(() => { loadTransactions() }, [loadTransactions])
  useEffect(() => { loadInflacion() }, [loadInflacion])

  const { subieron, bajaron, totalCurr, totalPrev, totalPctChange } = useMemo(() => {
    function sumByCategory(txs: Transaction[]) {
      const map = new Map<string, { amount: number; color: string }>()
      for (const tx of txs) {
        if (!tx.category) continue
        const key = tx.category.name
        const existing = map.get(key)
        if (existing) {
          existing.amount += Number(tx.amount)
        } else {
          map.set(key, { amount: Number(tx.amount), color: tx.category.color })
        }
      }
      return map
    }

    const currBycat = sumByCategory(currMonthTxs)
    const prevBycat = sumByCategory(prevMonthTxs)
    const allCatNames = new Set([...currBycat.keys(), ...prevBycat.keys()])

    const trends: CategoryTrend[] = []
    for (const name of allCatNames) {
      const curr = currBycat.get(name)
      const prev = prevBycat.get(name)
      const currAmount = curr?.amount ?? 0
      const prevAmount = prev?.amount ?? 0
      const color = curr?.color ?? prev?.color ?? '#6b7280'
      if (prevAmount === 0 && currAmount === 0) continue
      if (prevAmount === 0) {
        // New category this month — no previous baseline to compare against
        trends.push({ name, color, prevAmount: 0, currAmount, pctChange: 100 })
        continue
      }
      const pctChange = ((currAmount - prevAmount) / prevAmount) * 100
      trends.push({ name, color, prevAmount, currAmount, pctChange })
    }

    const subieron = trends.filter(t => t.pctChange > 0).sort((a, b) => b.pctChange - a.pctChange).slice(0, 6)
    const bajaron = trends.filter(t => t.pctChange < 0).sort((a, b) => a.pctChange - b.pctChange).slice(0, 6)
    const totalCurr = currMonthTxs.reduce((s, tx) => s + Number(tx.amount), 0)
    const totalPrev = prevMonthTxs.reduce((s, tx) => s + Number(tx.amount), 0)
    const totalPctChange = totalPrev > 0 ? ((totalCurr - totalPrev) / totalPrev) * 100 : null

    return { subieron, bajaron, totalCurr, totalPrev, totalPctChange }
  }, [currMonthTxs, prevMonthTxs])

  return {
    loading,
    inflacionLoading,
    inflacionError,
    subieron,
    bajaron,
    inflacionData,
    lastInflacion,
    acumuladoAnual,
    totalCurr,
    totalPrev,
    totalPctChange,
    currMonthLabel,
    prevMonthLabel,
  }
}
