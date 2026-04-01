'use client'

import { DolarRate } from '@/lib/types'
import { Minus } from 'lucide-react'
import { ClassNames } from './dollarCard.styles'
import { useDollarCard } from '@/LogicService/ui/DollarCard/useDollarCard'

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
      <div className={ClassNames.skeleton}>
        <div className={ClassNames.skeletonTitle} />
        <div className={ClassNames.skeletonValue} />
        <div className={ClassNames.skeletonSub} />
      </div>
    )
  }

  return (
    <div className={`${ClassNames.cardBase} ${highlight ? ClassNames.cardHighlight : ClassNames.cardDefault}`}>
      {badge && <span className={ClassNames.badge}>{badge}</span>}

      <h3 className={ClassNames.title}>{title}</h3>

      <div className={ClassNames.rows}>
        <div className={ClassNames.row}>
          <span className={ClassNames.label}>Compra</span>
          <span className={ClassNames.valueDefault}>{formatPrice(rate.compra)}</span>
        </div>
        <div className={ClassNames.row}>
          <span className={ClassNames.label}>Venta</span>
          <span className={highlight ? ClassNames.valueHighlight : ClassNames.valueNormal}>
            {formatPrice(rate.venta)}
          </span>
        </div>
        <div className={ClassNames.divider}>
          <span className={ClassNames.label}>Spread</span>
          <div className={ClassNames.spread}>
            <Minus className="w-3 h-3" />
            <span>{formatPrice(spread)} ({spreadPct}%)</span>
          </div>
        </div>
      </div>

      {updatedAt && <p className={ClassNames.updatedAt}>Act: {updatedAt}</p>}
    </div>
  )
}
