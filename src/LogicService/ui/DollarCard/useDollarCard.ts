import { DolarRate } from '@/lib/types'

export function useDollarCard(rate: DolarRate | null) {
  const formatPrice = (val: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(val)

  const spread = rate ? rate.venta - rate.compra : 0
  const spreadPct = rate && rate.compra > 0
    ? ((spread / rate.compra) * 100).toFixed(1)
    : '0'

  const updatedAt = rate?.fechaActualizacion
    ? new Date(rate.fechaActualizacion).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return { formatPrice, spread, spreadPct, updatedAt }
}
