'use client'

import { DolarRate } from '@/lib/types'
import { Minus } from 'lucide-react'
import { S } from './dollarCard.styles'

interface DollarCardProps {
  title: string
  rate: DolarRate | null
  highlight?: boolean
  badge?: string
}

export default function DollarCard({ title, rate, highlight, badge }: DollarCardProps) {
  if (!rate) {
    return (
      <div className={S.skeleton}>
        <div className={S.skeletonTitle} />
        <div className={S.skeletonValue} />
        <div className={S.skeletonSub} />
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
    <div className={`${S.cardBase} ${highlight ? S.cardHighlight : S.cardDefault}`}>
      {badge && <span className={S.badge}>{badge}</span>}

      <h3 className={S.title}>{title}</h3>

      <div className={S.rows}>
        <div className={S.row}>
          <span className={S.label}>Compra</span>
          <span className={S.valueDefault}>{formatPrice(rate.compra)}</span>
        </div>
        <div className={S.row}>
          <span className={S.label}>Venta</span>
          <span className={highlight ? S.valueHighlight : S.valueNormal}>
            {formatPrice(rate.venta)}
          </span>
        </div>
        <div className={S.divider}>
          <span className={S.label}>Spread</span>
          <div className={S.spread}>
            <Minus className="w-3 h-3" />
            <span>{formatPrice(spread)} ({spreadPct}%)</span>
          </div>
        </div>
      </div>

      {rate.fechaActualizacion && (
        <p className={S.updatedAt}>
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
