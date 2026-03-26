'use client'

import { DolarRate } from '@/lib/types'
import { Minus } from 'lucide-react'
import { S } from './dollarCard.styles'
import { useDollarCard } from './logic/useDollarCard'

interface DollarCardProps {
  title: string
  rate: DolarRate | null
  highlight?: boolean
  badge?: string
}

export default function DollarCard({ title, rate, highlight, badge }: DollarCardProps) {
  const { formatPrice, spread, spreadPct, updatedAt } = useDollarCard(rate)

  if (!rate) {
    return (
      <div className={S.skeleton}>
        <div className={S.skeletonTitle} />
        <div className={S.skeletonValue} />
        <div className={S.skeletonSub} />
      </div>
    )
  }

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

      {updatedAt && <p className={S.updatedAt}>Act: {updatedAt}</p>}
    </div>
  )
}
