'use client'

import { DolarRate } from '@/lib/types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DollarCardProps {
  title: string
  rate: DolarRate | null
  highlight?: boolean
  badge?: string
}

export default function DollarCard({ title, rate, highlight, badge }: DollarCardProps) {
  if (!rate) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-700 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-700 rounded w-20" />
      </div>
    )
  }

  const spread = rate.venta - rate.compra
  const spreadPct = rate.compra > 0 ? ((spread / rate.compra) * 100).toFixed(1) : '0'

  const formatPrice = (val: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(val)

  return (
    <div
      className={`relative bg-gray-800/50 border rounded-2xl p-5 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 ${
        highlight
          ? 'border-emerald-500/40 shadow-md shadow-emerald-500/10'
          : 'border-gray-700/50'
      }`}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}

      <h3 className="text-gray-400 text-sm font-medium mb-3">{title}</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Compra</span>
          <span className="text-white font-semibold">{formatPrice(rate.compra)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Venta</span>
          <span className={`font-bold text-lg ${highlight ? 'text-emerald-400' : 'text-white'}`}>
            {formatPrice(rate.venta)}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-700/50 flex items-center justify-between">
          <span className="text-gray-500 text-xs">Spread</span>
          <div className="flex items-center gap-1 text-amber-400 text-xs">
            <Minus className="w-3 h-3" />
            <span>{formatPrice(spread)} ({spreadPct}%)</span>
          </div>
        </div>
      </div>

      {rate.fechaActualizacion && (
        <p className="mt-3 text-gray-600 text-xs truncate">
          Act: {new Date(rate.fechaActualizacion).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  )
}
