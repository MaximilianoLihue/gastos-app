import { createClient } from '@/lib/supabase/server'
import { fetchAllDolarRates, calcularUSDPosibles } from '@/lib/dolar'
import { Transaction, DashboardStats } from '@/lib/types'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { ClassNames } from './page.styles'

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
  const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')

  // Fetch transactions for current month
  const { data: thisMonthTxs } = await supabase
    .from('transactions')
    .select('*, category:categories(name, color, type)')
    .gte('date', thisMonthStart)
    .lte('date', thisMonthEnd)
    .order('date', { ascending: false })

  // Fetch transactions for last month (for comparison + alerts)
  const { data: lastMonthTxs } = await supabase
    .from('transactions')
    .select('amount, type, currency, category:categories(name, color)')
    .gte('date', lastMonthStart)
    .lte('date', lastMonthEnd)

  // Fetch recent transactions (last 5)
  const { data: recentTxs } = await supabase
    .from('transactions')
    .select('*, category:categories(name, color)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  // Dollar rates
  const dolarRates = await fetchAllDolarRates()

  const transactions = thisMonthTxs as Transaction[] ?? []
  const lastMonthTransactions = lastMonthTxs ?? []

  // Convert USD amounts to ARS using blue sell rate for unified totals
  const blueVenta = dolarRates.blue?.venta ?? 1
  const toARS = (amount: number, currency: string) =>
    currency === 'USD' ? amount * blueVenta : amount

  // Calculate stats (USD converted to ARS at blue rate)
  const totalIngresos = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + toARS(Number(t.amount), t.currency ?? 'ARS'), 0)

  const totalGastos = transactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + toARS(Number(t.amount), t.currency ?? 'ARS'), 0)

  const balance = totalIngresos - totalGastos
  const surplus = balance > 0 ? balance : 0

  const lastMonthIngresos = lastMonthTransactions
    .filter((t: { type: string }) => t.type === 'ingreso')
    .reduce((sum: number, t: { amount: number; currency?: string }) => sum + toARS(Number(t.amount), t.currency ?? 'ARS'), 0)

  const lastMonthGastos = lastMonthTransactions
    .filter((t: { type: string }) => t.type === 'gasto')
    .reduce((sum: number, t: { amount: number; currency?: string }) => sum + toARS(Number(t.amount), t.currency ?? 'ARS'), 0)

  const usdPosibles = calcularUSDPosibles(surplus, dolarRates)

  const ingresosChange = lastMonthIngresos > 0
    ? ((totalIngresos - lastMonthIngresos) / lastMonthIngresos) * 100
    : 0

  const gastosChange = lastMonthGastos > 0
    ? ((totalGastos - lastMonthGastos) / lastMonthGastos) * 100
    : 0

  const stats: DashboardStats = { totalIngresos, totalGastos, balance, surplus }

  // Top spending categories this month
  const gastosPorCategoria = transactions
    .filter(t => t.type === 'gasto')
    .reduce((acc, t) => {
      const key = t.category?.name ?? 'Sin categoría'
      const color = t.category?.color ?? '#6b7280'
      if (!acc[key]) acc[key] = { name: key, color, total: 0 }
      acc[key].total += toARS(Number(t.amount), t.currency ?? 'ARS')
      return acc
    }, {} as Record<string, { name: string; color: string; total: number }>)

  const topCategorias = Object.values(gastosPorCategoria)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  // Spending alerts — compare this month vs last month by category
  type LastTx = { amount: number; type: string; currency?: string; category?: { name: string; color: string } | null }
  const gastosPorCatMesAnterior = ((lastMonthTxs ?? []) as unknown as LastTx[])
    .filter(t => t.type === 'gasto')
    .reduce((acc, t) => {
      const key = t.category?.name ?? 'Sin categoría'
      acc[key] = (acc[key] ?? 0) + toARS(Number(t.amount), t.currency ?? 'ARS')
      return acc
    }, {} as Record<string, number>)

  interface SpendingAlert {
    category: string
    color: string
    thisMonth: number
    lastMonth: number
    pctOfTotal: number
    pctChange: number
    type: 'spike' | 'high_share' | 'new'
    message: string
  }

  const alerts: SpendingAlert[] = []

  for (const [name, data] of Object.entries(gastosPorCategoria)) {
    const last = gastosPorCatMesAnterior[name] ?? 0
    const pctOfTotal = totalGastos > 0 ? (data.total / totalGastos) * 100 : 0
    const pctChange = last > 0 ? ((data.total - last) / last) * 100 : 0

    // Alert: category spiked more than 30% vs last month
    if (last > 0 && pctChange >= 30 && data.total > 5000) {
      alerts.push({
        category: name, color: data.color,
        thisMonth: data.total, lastMonth: last,
        pctOfTotal, pctChange, type: 'spike',
        message: `Subió ${pctChange.toFixed(0)}% respecto al mes pasado`,
      })
    }
    // Alert: category represents more than 35% of total spending
    else if (pctOfTotal >= 35 && data.total > 5000) {
      alerts.push({
        category: name, color: data.color,
        thisMonth: data.total, lastMonth: last,
        pctOfTotal, pctChange, type: 'high_share',
        message: `Representa el ${pctOfTotal.toFixed(0)}% de tus gastos del mes`,
      })
    }
    // Alert: new category this month (wasn't in last month) with significant amount
    else if (last === 0 && pctOfTotal >= 15 && data.total > 5000) {
      alerts.push({
        category: name, color: data.color,
        thisMonth: data.total, lastMonth: 0,
        pctOfTotal, pctChange, type: 'new',
        message: `Gasto nuevo este mes — ${pctOfTotal.toFixed(0)}% de tus gastos totales`,
      })
    }
  }

  // Sort by most impactful
  alerts.sort((a, b) => b.thisMonth - a.thisMonth)

  const mesActual = format(now, 'MMMM yyyy', { locale: es })

  return (
    <div className={ClassNames.root}>
      {/* Welcome */}
      <div>
        <h1 className={ClassNames.welcomeTitle}>
          {format(now, "EEEE, d 'de' MMMM", { locale: es })}
        </h1>
        <p className={ClassNames.welcomeSub}>
          Resumen del mes de{' '}
          <span className={ClassNames.welcomeHighlight}>{mesActual}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className={ClassNames.statsGrid}>
        {/* Ingresos */}
        <div className={ClassNames.statCard}>
          <div className={ClassNames.statCardHeader}>
            <div className={ClassNames.statIconIngreso}>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            {ingresosChange !== 0 && (
              <span className={ingresosChange >= 0 ? ClassNames.statChangePos : ClassNames.statChangeNeg}>
                {ingresosChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(ingresosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className={ClassNames.statLabel}>Ingresos</p>
          <p className={ClassNames.statValue}>{formatARS(totalIngresos)}</p>
          <p className={ClassNames.statSub}>vs mes anterior</p>
        </div>

        {/* Gastos */}
        <div className={ClassNames.statCard}>
          <div className={ClassNames.statCardHeader}>
            <div className={ClassNames.statIconGasto}>
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            {gastosChange !== 0 && (
              <span className={gastosChange <= 0 ? ClassNames.statChangePos : ClassNames.statChangeNeg}>
                {gastosChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(gastosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className={ClassNames.statLabel}>Gastos</p>
          <p className={ClassNames.statValue}>{formatARS(totalGastos)}</p>
          <p className={ClassNames.statSub}>vs mes anterior</p>
        </div>

        {/* Balance */}
        <div className={ClassNames.statCard}>
          <div className={ClassNames.statCardHeader}>
            <div className={balance >= 0 ? ClassNames.statIconBluePos : ClassNames.statIconOrangeNeg}>
              <Wallet className={`w-5 h-5 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`} />
            </div>
          </div>
          <p className={ClassNames.statLabel}>Balance</p>
          <p className={balance >= 0 ? ClassNames.statValueBalancePos : ClassNames.statValueBalanceNeg}>
            {formatARS(balance)}
          </p>
          <p className={ClassNames.statSub}>Ingresos - Gastos</p>
        </div>

        {/* USD con blue */}
        <div className={ClassNames.statCard}>
          <div className={ClassNames.statCardHeader}>
            <div className={ClassNames.statIconAmber}>
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className={ClassNames.statLabel}>USD (dólar blue)</p>
          <p className={ClassNames.statValueAmber}>
            {usdPosibles.blue !== null
              ? formatUSD(usdPosibles.blue)
              : surplus <= 0
              ? 'Sin superávit'
              : 'N/D'}
          </p>
          <p className={ClassNames.statSub}>
            {dolarRates.blue
              ? `Venta: ${formatARS(dolarRates.blue.venta)}`
              : 'Cotización no disponible'}
          </p>
        </div>
      </div>

      {/* Top spending categories */}
      {topCategorias.length > 0 && (
        <div className={ClassNames.topCatCard}>
          <div className={ClassNames.topCatHeader}>
            <h3 className={ClassNames.topCatTitle}>¿En qué gasto más?</h3>
            <span className={ClassNames.topCatMonth}>{mesActual}</span>
          </div>
          <div className={ClassNames.topCatGrid}>
            {topCategorias.map((cat, i) => {
              const pct = totalGastos > 0 ? (cat.total / totalGastos) * 100 : 0
              return (
                <div key={cat.name} className={ClassNames.topCatRow}>
                  <div className={ClassNames.topCatMeta}>
                    <div className={ClassNames.topCatLeft}>
                      <span className={ClassNames.topCatRank}>#{i + 1}</span>
                      <div className={ClassNames.topCatColorDot} style={{ backgroundColor: cat.color }} />
                      <span className={ClassNames.topCatName}>{cat.name}</span>
                    </div>
                    <div className={ClassNames.topCatRight}>
                      <span className={ClassNames.topCatAmount}>{formatARS(cat.total)}</span>
                      <span className={ClassNames.topCatPct}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className={ClassNames.topCatBar}>
                    <div
                      className={ClassNames.topCatBarFill}
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {totalGastos > 0 && (
            <div className={ClassNames.topCatFooter}>
              <span className={ClassNames.topCatFooterLabel}>Total gastado este mes</span>
              <span className={ClassNames.topCatFooterValue}>{formatARS(totalGastos)}</span>
            </div>
          )}
        </div>
      )}

      {/* Spending alerts */}
      {alerts.length > 0 && (
        <div className={ClassNames.alertsCard}>
          <div className={ClassNames.alertsHeader}>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className={ClassNames.alertsTitle}>Señales de gasto</h3>
            <span className={ClassNames.alertsMonth}>{mesActual}</span>
          </div>
          <div className={ClassNames.alertsGrid}>
            {alerts.map((alert) => {
              const isSpike = alert.type === 'spike'
              const isHighShare = alert.type === 'high_share'
              const isNew = alert.type === 'new'

              const Icon = isSpike ? TrendingUp : isHighShare ? AlertTriangle : Sparkles

              const suggestion = isSpike
                ? `Revisá si podés reducir gastos en ${alert.category}.`
                : isHighShare
                ? `${alert.category} consume una parte grande de tu presupuesto.`
                : `Primera vez que gastás en ${alert.category} este mes.`

              return (
                <div
                  key={alert.category}
                  className={isSpike ? ClassNames.alertItemSpike : isHighShare ? ClassNames.alertItemHighShare : ClassNames.alertItemNew}
                >
                  <div className={ClassNames.alertItemRow}>
                    <div
                      className={ClassNames.alertItemDot}
                      style={{ backgroundColor: alert.color }}
                    />
                    <span className={ClassNames.alertItemCat}>{alert.category}</span>
                    <Icon className={isSpike ? ClassNames.alertIconSpike : isHighShare ? ClassNames.alertIconHighShare : ClassNames.alertIconNew} />
                  </div>
                  <p className={isSpike ? ClassNames.alertMsgSpike : isHighShare ? ClassNames.alertMsgHighShare : ClassNames.alertMsgNew}>{alert.message}</p>
                  <div className={ClassNames.alertAmounts}>
                    <span>Este mes: <span className="text-white font-medium">{formatARS(alert.thisMonth)}</span></span>
                    {alert.lastMonth > 0 && (
                      <span>Anterior: <span className="text-gray-300">{formatARS(alert.lastMonth)}</span></span>
                    )}
                  </div>
                  <p className={ClassNames.alertSuggestion}>{suggestion}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className={ClassNames.bottomGrid}>
        {/* Recent transactions */}
        <div className={ClassNames.recentCard}>
          <div className={ClassNames.recentHeader}>
            <h3 className={ClassNames.recentTitle}>Últimas transacciones</h3>
            <Link
              href="/transacciones"
              className={ClassNames.recentLink}
            >
              Ver todas
            </Link>
          </div>

          {!recentTxs || recentTxs.length === 0 ? (
            <div className={ClassNames.emptyWrap}>
              <Receipt className="w-10 h-10 text-gray-600 mb-3" />
              <p className={ClassNames.emptyText}>No hay transacciones aún</p>
              <Link
                href="/transacciones"
                className={ClassNames.emptyLink}
              >
                Agregar primera transacción
              </Link>
            </div>
          ) : (
            <div className={ClassNames.txList}>
              {(recentTxs as Transaction[]).map((tx) => (
                <div
                  key={tx.id}
                  className={ClassNames.txRow}
                >
                  <div
                    className={ClassNames.txIconWrap}
                    style={{
                      backgroundColor: `${tx.category?.color ?? '#6b7280'}20`,
                    }}
                  >
                    <div
                      className={ClassNames.txIconDot}
                      style={{
                        backgroundColor: tx.category?.color ?? '#6b7280',
                      }}
                    />
                  </div>
                  <div className={ClassNames.txMeta}>
                    <p className={ClassNames.txDesc}>
                      {tx.description || tx.category?.name || 'Sin descripción'}
                    </p>
                    <p className={ClassNames.txSub}>
                      {tx.category?.name ?? 'Sin categoría'} •{' '}
                      {format(new Date(tx.date + 'T00:00:00'), 'd MMM', { locale: es })}
                    </p>
                  </div>
                  <span className={tx.type === 'ingreso' ? ClassNames.txAmountIngreso : ClassNames.txAmountGasto}>
                    {tx.type === 'ingreso' ? '+' : '-'}
                    {formatARS(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className={ClassNames.quickStats}>
          {/* Spending progress */}
          <div className={ClassNames.thisMonthCard}>
            <h3 className={ClassNames.thisMonthTitle}>Este mes</h3>
            <div className={ClassNames.thisMonthInner}>
              <div>
                <div className={ClassNames.progressMeta}>
                  <span className={ClassNames.progressLabel}>Gasto vs Ingreso</span>
                  <span className={ClassNames.progressValue}>
                    {totalIngresos > 0
                      ? `${Math.min(Math.round((totalGastos / totalIngresos) * 100), 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className={ClassNames.progressBar}>
                  <div
                    className={totalGastos > totalIngresos ? ClassNames.progressFillBad : ClassNames.progressFillGood}
                    style={{
                      width: `${
                        totalIngresos > 0
                          ? Math.min((totalGastos / totalIngresos) * 100, 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className={ClassNames.miniGrid}>
                <div className={ClassNames.miniCard}>
                  <p className={ClassNames.miniLabel}>Transacciones</p>
                  <p className={ClassNames.miniValue}>{transactions.length}</p>
                </div>
                <div className={ClassNames.miniCard}>
                  <p className={ClassNames.miniLabel}>Superávit</p>
                  <p className={surplus > 0 ? ClassNames.miniSurplusPos : ClassNames.miniSurplusNeg}>
                    {formatARS(surplus)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dollar quick view */}
          {dolarRates.blue && (
            <div className={ClassNames.dolarCard}>
              <div className={ClassNames.dolarHeader}>
                <h3 className={ClassNames.dolarTitle}>Dólar blue</h3>
                <Link
                  href="/dolar"
                  className={ClassNames.dolarLink}
                >
                  Ver todo
                </Link>
              </div>
              <div className={ClassNames.dolarRow}>
                <div>
                  <p className={ClassNames.dolarBuyLabel}>Compra</p>
                  <p className={ClassNames.dolarBuyValue}>
                    {formatARS(dolarRates.blue.compra)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={ClassNames.dolarSellLabel}>Venta</p>
                  <p className={ClassNames.dolarSellValue}>
                    {formatARS(dolarRates.blue.venta)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
