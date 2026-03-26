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
import { S } from './page.styles'

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
    .select('amount, type, category:categories(name, color)')
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

  // Calculate stats
  const totalIngresos = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalGastos = transactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIngresos - totalGastos
  const surplus = balance > 0 ? balance : 0

  const lastMonthIngresos = lastMonthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const lastMonthGastos = lastMonthTransactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + Number(t.amount), 0)

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
      acc[key].total += Number(t.amount)
      return acc
    }, {} as Record<string, { name: string; color: string; total: number }>)

  const topCategorias = Object.values(gastosPorCategoria)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  // Spending alerts — compare this month vs last month by category
  type LastTx = { amount: number; type: string; category?: { name: string; color: string } | null }
  const gastosPorCatMesAnterior = ((lastMonthTxs ?? []) as unknown as LastTx[])
    .filter(t => t.type === 'gasto')
    .reduce((acc, t) => {
      const key = t.category?.name ?? 'Sin categoría'
      acc[key] = (acc[key] ?? 0) + Number(t.amount)
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
    <div className={S.root}>
      {/* Welcome */}
      <div>
        <h1 className={S.welcomeTitle}>
          {format(now, "EEEE, d 'de' MMMM", { locale: es })}
        </h1>
        <p className={S.welcomeSub}>
          Resumen del mes de{' '}
          <span className={S.welcomeHighlight}>{mesActual}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className={S.statsGrid}>
        {/* Ingresos */}
        <div className={S.statCard}>
          <div className={S.statCardHeader}>
            <div className={S.statIconIngreso}>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            {ingresosChange !== 0 && (
              <span className={ingresosChange >= 0 ? S.statChangePos : S.statChangeNeg}>
                {ingresosChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(ingresosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className={S.statLabel}>Ingresos</p>
          <p className={S.statValue}>{formatARS(totalIngresos)}</p>
          <p className={S.statSub}>vs mes anterior</p>
        </div>

        {/* Gastos */}
        <div className={S.statCard}>
          <div className={S.statCardHeader}>
            <div className={S.statIconGasto}>
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            {gastosChange !== 0 && (
              <span className={gastosChange <= 0 ? S.statChangePos : S.statChangeNeg}>
                {gastosChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(gastosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className={S.statLabel}>Gastos</p>
          <p className={S.statValue}>{formatARS(totalGastos)}</p>
          <p className={S.statSub}>vs mes anterior</p>
        </div>

        {/* Balance */}
        <div className={S.statCard}>
          <div className={S.statCardHeader}>
            <div className={balance >= 0 ? S.statIconBluePos : S.statIconOrangeNeg}>
              <Wallet className={`w-5 h-5 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`} />
            </div>
          </div>
          <p className={S.statLabel}>Balance</p>
          <p className={balance >= 0 ? S.statValueBalancePos : S.statValueBalanceNeg}>
            {formatARS(balance)}
          </p>
          <p className={S.statSub}>Ingresos - Gastos</p>
        </div>

        {/* USD con blue */}
        <div className={S.statCard}>
          <div className={S.statCardHeader}>
            <div className={S.statIconAmber}>
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className={S.statLabel}>USD (dólar blue)</p>
          <p className={S.statValueAmber}>
            {usdPosibles.blue !== null
              ? formatUSD(usdPosibles.blue)
              : surplus <= 0
              ? 'Sin superávit'
              : 'N/D'}
          </p>
          <p className={S.statSub}>
            {dolarRates.blue
              ? `Venta: ${formatARS(dolarRates.blue.venta)}`
              : 'Cotización no disponible'}
          </p>
        </div>
      </div>

      {/* Top spending categories */}
      {topCategorias.length > 0 && (
        <div className={S.topCatCard}>
          <div className={S.topCatHeader}>
            <h3 className={S.topCatTitle}>¿En qué gasto más?</h3>
            <span className={S.topCatMonth}>{mesActual}</span>
          </div>
          <div className={S.topCatGrid}>
            {topCategorias.map((cat, i) => {
              const pct = totalGastos > 0 ? (cat.total / totalGastos) * 100 : 0
              return (
                <div key={cat.name} className={S.topCatRow}>
                  <div className={S.topCatMeta}>
                    <div className={S.topCatLeft}>
                      <span className={S.topCatRank}>#{i + 1}</span>
                      <div className={S.topCatColorDot} style={{ backgroundColor: cat.color }} />
                      <span className={S.topCatName}>{cat.name}</span>
                    </div>
                    <div className={S.topCatRight}>
                      <span className={S.topCatAmount}>{formatARS(cat.total)}</span>
                      <span className={S.topCatPct}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className={S.topCatBar}>
                    <div
                      className={S.topCatBarFill}
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {totalGastos > 0 && (
            <div className={S.topCatFooter}>
              <span className={S.topCatFooterLabel}>Total gastado este mes</span>
              <span className={S.topCatFooterValue}>{formatARS(totalGastos)}</span>
            </div>
          )}
        </div>
      )}

      {/* Spending alerts */}
      {alerts.length > 0 && (
        <div className={S.alertsCard}>
          <div className={S.alertsHeader}>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className={S.alertsTitle}>Señales de gasto</h3>
            <span className={S.alertsMonth}>{mesActual}</span>
          </div>
          <div className={S.alertsGrid}>
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
                  className={isSpike ? S.alertItemSpike : isHighShare ? S.alertItemHighShare : S.alertItemNew}
                >
                  <div className={S.alertItemRow}>
                    <div
                      className={S.alertItemDot}
                      style={{ backgroundColor: alert.color }}
                    />
                    <span className={S.alertItemCat}>{alert.category}</span>
                    <Icon className={isSpike ? S.alertIconSpike : isHighShare ? S.alertIconHighShare : S.alertIconNew} />
                  </div>
                  <p className={isSpike ? S.alertMsgSpike : isHighShare ? S.alertMsgHighShare : S.alertMsgNew}>{alert.message}</p>
                  <div className={S.alertAmounts}>
                    <span>Este mes: <span className="text-white font-medium">{formatARS(alert.thisMonth)}</span></span>
                    {alert.lastMonth > 0 && (
                      <span>Anterior: <span className="text-gray-300">{formatARS(alert.lastMonth)}</span></span>
                    )}
                  </div>
                  <p className={S.alertSuggestion}>{suggestion}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className={S.bottomGrid}>
        {/* Recent transactions */}
        <div className={S.recentCard}>
          <div className={S.recentHeader}>
            <h3 className={S.recentTitle}>Últimas transacciones</h3>
            <Link
              href="/transacciones"
              className={S.recentLink}
            >
              Ver todas
            </Link>
          </div>

          {!recentTxs || recentTxs.length === 0 ? (
            <div className={S.emptyWrap}>
              <Receipt className="w-10 h-10 text-gray-600 mb-3" />
              <p className={S.emptyText}>No hay transacciones aún</p>
              <Link
                href="/transacciones"
                className={S.emptyLink}
              >
                Agregar primera transacción
              </Link>
            </div>
          ) : (
            <div className={S.txList}>
              {(recentTxs as Transaction[]).map((tx) => (
                <div
                  key={tx.id}
                  className={S.txRow}
                >
                  <div
                    className={S.txIconWrap}
                    style={{
                      backgroundColor: `${tx.category?.color ?? '#6b7280'}20`,
                    }}
                  >
                    <div
                      className={S.txIconDot}
                      style={{
                        backgroundColor: tx.category?.color ?? '#6b7280',
                      }}
                    />
                  </div>
                  <div className={S.txMeta}>
                    <p className={S.txDesc}>
                      {tx.description || tx.category?.name || 'Sin descripción'}
                    </p>
                    <p className={S.txSub}>
                      {tx.category?.name ?? 'Sin categoría'} •{' '}
                      {format(new Date(tx.date + 'T00:00:00'), 'd MMM', { locale: es })}
                    </p>
                  </div>
                  <span className={tx.type === 'ingreso' ? S.txAmountIngreso : S.txAmountGasto}>
                    {tx.type === 'ingreso' ? '+' : '-'}
                    {formatARS(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className={S.quickStats}>
          {/* Spending progress */}
          <div className={S.thisMonthCard}>
            <h3 className={S.thisMonthTitle}>Este mes</h3>
            <div className={S.thisMonthInner}>
              <div>
                <div className={S.progressMeta}>
                  <span className={S.progressLabel}>Gasto vs Ingreso</span>
                  <span className={S.progressValue}>
                    {totalIngresos > 0
                      ? `${Math.min(Math.round((totalGastos / totalIngresos) * 100), 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className={S.progressBar}>
                  <div
                    className={totalGastos > totalIngresos ? S.progressFillBad : S.progressFillGood}
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

              <div className={S.miniGrid}>
                <div className={S.miniCard}>
                  <p className={S.miniLabel}>Transacciones</p>
                  <p className={S.miniValue}>{transactions.length}</p>
                </div>
                <div className={S.miniCard}>
                  <p className={S.miniLabel}>Superávit</p>
                  <p className={surplus > 0 ? S.miniSurplusPos : S.miniSurplusNeg}>
                    {formatARS(surplus)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dollar quick view */}
          {dolarRates.blue && (
            <div className={S.dolarCard}>
              <div className={S.dolarHeader}>
                <h3 className={S.dolarTitle}>Dólar blue</h3>
                <Link
                  href="/dolar"
                  className={S.dolarLink}
                >
                  Ver todo
                </Link>
              </div>
              <div className={S.dolarRow}>
                <div>
                  <p className={S.dolarBuyLabel}>Compra</p>
                  <p className={S.dolarBuyValue}>
                    {formatARS(dolarRates.blue.compra)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={S.dolarSellLabel}>Venta</p>
                  <p className={S.dolarSellValue}>
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
