import { CategoryData } from '@/lib/types'

const RADIAN = Math.PI / 180

export function useExpenseChart() {
  function formatARS(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value)
  }

  function formatCurrencyFull(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value)
  }

  function renderCustomizedLabel(props: {
    cx?: number; cy?: number; midAngle?: number
    innerRadius?: number; outerRadius?: number; percent?: number
  }) {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
    if (percent < 0.05) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return { x, y, label: `${(percent * 100).toFixed(0)}%` }
  }

  function sortedByValue(data: CategoryData[]) {
    return [...data].sort((a, b) => b.value - a.value)
  }

  return { formatARS, formatCurrency, formatCurrencyFull, renderCustomizedLabel, sortedByValue }
}
