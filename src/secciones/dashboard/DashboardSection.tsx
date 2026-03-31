import { createClient } from '@/lib/supabase/server'
import { fetchAllDolarRates, calcularUSDPosibles } from '@/LogicService/dolar/dolarService'
import { Transaction, DashboardStats } from '@/lib/types'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { cookies } from 'next/headers'
import { getT, LANG_COOKIE, DEFAULT_LANG, type Lang } from '@/lib/i18n/index'
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

export async function DashboardSection() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const lang = (cookieStore.get(LANG_COOKIE)?.value ?? DEFAULT_LANG) as Lang
  const t = getT(lang)
  const dateLocale = lang === 'en' ? enUS : es

  const now = new Date()
  const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
  const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')

  const { data: thisMonthTxs } = await supabase
    .from('transactions')
    .select('*, category:categories(name, color, type)')
    .gte('date', thisMonthStart)
    .lte('date', thisMonthEnd)
    .order('date', { ascending: false })

  const { data: lastMonthTxs } = await supabase
    .from('transactions')
    .select('amount, type, currency, category:categories(name, color)')
    .gte('date', lastMonthStart)
    .lte('date', lastMonthEnd)

  const { data: recentTxs } = await supabase
    .from('transactions')
    .select('*, category:categories(name, color)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  const dolarRates = await fetchAllDolarRates()

  const transactions = thisMonthTxs as Transaction[] ?? []
  const lastMonthTransactions = lastMonthTxs ?? []

  const blueVenta = dolarRates.blue?.venta ?? 1
  const toARS = (amount: number, currency: string) =>
    currency === 'USD' ? amount * blueVenta : amount

  const totalIngresos = transactions
    .filter((tx) => tx.type === 'ingreso')
    .reduce((sum, tx) => sum + toARS(Number(tx.amount), tx.currency ?? 'ARS'), 0)

  const totalGastos = transactions
    .filter((tx) => tx.type === 'gasto')
    .reduce((sum, tx) => sum + toARS(Number(tx.amount), tx.currency ?? 'ARS'), 0)

  const balance = totalIngresos - totalGastos
  const surplus = balance > 0 ? balance : 0

  const lastMonthIngresos = lastMonthTransactions
    .filter((tx: { type: string }) => tx.type === 'ingreso')
    .reduce((sum: number, tx: { amount: number; currency?: string }) => sum + toARS(Number(tx.amount), tx.currency ?? 'ARS'), 0)

  const lastMonthGastos = lastMonthTransactions
    .filter((tx: { type: string }) => tx.type === 'gasto')
    .reduce((sum: number, tx: { amount: number; currency?: string }) => sum + toARS(Number(tx.amount), tx.currency ?? 'ARS'), 0)

  const usdPosibles = calcularUSDPosibles(surplus, dolarRates)

  const ingresosChange = lastMonthIngresos > 0
    ? ((totalIngresos - lastMonthIngresos) / lastMonthIngresos) * 100
    : 0

  const gastosChange = lastMonthGastos > 0
    ? ((totalGastos - lastMonthGastos) / lastMonthGastos) * 100
    : 0

  const stats: DashboardStats = { totalIngresos, totalGastos, balance, surplus }

  const gastosPorCategoria = transactions
    .filter(tx => tx.type === 'gasto')
    .reduce((acc, tx) => {
      const key = tx.category?.name ?? t.common.noCategory
      const color = tx.category?.color ?? '#6b7280'
      if (!acc[key]) acc[key] = { name: key, color, total: 0 }
      acc[key].total += toARS(Number(tx.amount), tx.currency ?? 'ARS')
      return acc
    }, {} as Record<string, { name: string; color: string; total: number }>)

  const topCategorias = Object.values(gastosPorCategoria)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  type LastTx = { amount: number; type: string; currency?: string; category?: { name: string; color: string } | null }
  const gastosPorCatMesAnterior = ((lastMonthTxs ?? []) as unknown as LastTx[])
    .filter(tx => tx.type === 'gasto')
    .reduce((acc, tx) => {
      const key = tx.category?.name ?? t.common.noCategory
      acc[key] = (acc[key] ?? 0) + toARS(Number(tx.amount), tx.currency ?? 'ARS')
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

    if (last > 0 && pctChange >= 30 && data.total > 5000) {
      alerts.push({ category: name, color: data.color, thisMonth: data.total, lastMonth: last, pctOfTotal, pctChange, type: 'spike', message: t.dashboard.alertSpike(pctChange.toFixed(0)) })
    } else if (pctOfTotal >= 35 && data.total > 5000) {
      alerts.push({ category: name, color: data.color, thisMonth: data.total, lastMonth: last, pctOfTotal, pctChange, type: 'high_share', message: t.dashboard.alertHighShare(pctOfTotal.toFixed(0)) })
    } else if (last === 0 && pctOfTotal >= 15 && data.total > 5000) {
      alerts.push({ category: name, color: data.color, thisMonth: data.total, lastMonth: 0, pctOfTotal, pctChange, type: 'new', message: t.dashboard.alertNew(pctOfTotal.toFixed(0)) })
    }
  }

  alerts.sort((a, b) => b.thisMonth - a.thisMonth)

  const mesActual = format(now, 'MMMM yyyy', { locale: dateLocale })

  return (
    <div className={ClassNames.root}>
      <div>
        <h1 className={ClassNames.welcomeTitle}>
          {lang === 'en' ? format(now, 'EEEE, MMMM d', { locale: dateLocale }) : format(now, "EEEE, d 'de' MMMM", { locale: dateLocale })}
        </h1>
        <p className={ClassNames.welcomeSub}>
          {t.dashboard.summaryFor}{' '}
          <span className={ClassNames.welcomeHighlight}>{mesActual}</span>
        </p>
      </div>

      <div className={ClassNames.statsGrid}>
        <div className={ClassNames.statCardIngreso}>
          <div className={ClassNames.statCardHeader}>
            <div className={ClassNames.statIconIngreso}>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            {ingresosChange !== 0 && (
              <span className={ingresosChange >= 0 ? ClassNames.statChangePos : ClassNames.statChangeNeg}>
                {ingresosChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(ingresosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className={ClassNames.statLabel}>{t.dashboard.statIncome}</p>
          <p className={ClassNames.statValue}>{formatARS(totalIngresos)}</p>
          <p className={ClassNames.statSub}>{t.dashboard.statVsLastMonth}</p>
        </div>

        <div className={ClassNames.statCardGasto}>
          <div className={ClassNames.statCardHeader}>
            <div className={ClassNames.statIconGasto}>
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            {gastosChange !== 0 && (
              <span className={gastosChange <= 0 ? ClassNames.statChangePos : ClassNames.statChangeNeg}>
                {gastosChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(gastosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className={ClassNames.statLabel}>{t.dashboard.statExpenses}</p>
          <p className={ClassNames.statValue}>{formatARS(totalGastos)}</p>
          <p className={ClassNames.statSub}>{t.dashboard.statVsLastMonth}</p>
        </div>

        <div className={ClassNames.statCardBalance}>
          <div className={ClassNames.statCardHeader}>
            <div className={balance >= 0 ? ClassNames.statIconBluePos : ClassNames.statIconOrangeNeg}>
              <Wallet className={`w-5 h-5 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`} />
            </div>
          </div>
          <p className={ClassNames.statLabel}>{t.dashboard.statBalance}</p>
          <p className={balance >= 0 ? ClassNames.statValueBalancePos : ClassNames.statValueBalanceNeg}>
            {formatARS(balance)}
          </p>
          <p className={ClassNames.statSub}>{t.dashboard.statIncomeFormula}</p>
        </div>

        <div className={ClassNames.statCardUSD}>
          <div className={ClassNames.statCardHeader}>
            <div className={ClassNames.statIconAmber}>
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className={ClassNames.statLabel}>{t.dashboard.statUsd}</p>
          <p className={ClassNames.statValueAmber}>
            {usdPosibles.blue !== null ? formatUSD(usdPosibles.blue) : surplus <= 0 ? t.dashboard.statNoSurplus : t.dashboard.statNa}
          </p>
          <p className={ClassNames.statSub}>
            {dolarRates.blue ? `${t.dashboard.sell} ${formatARS(dolarRates.blue.venta)}` : t.dashboard.statRateUnavailable}
          </p>
        </div>
      </div>

      {topCategorias.length > 0 && (
        <div className={ClassNames.topCatCard}>
          <div className={ClassNames.topCatHeader}>
            <h3 className={ClassNames.topCatTitle}>{t.dashboard.topSpending}</h3>
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
                    <div className={ClassNames.topCatBarFill} style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>
          {totalGastos > 0 && (
            <div className={ClassNames.topCatFooter}>
              <span className={ClassNames.topCatFooterLabel}>{t.dashboard.totalSpent}</span>
              <span className={ClassNames.topCatFooterValue}>{formatARS(totalGastos)}</span>
            </div>
          )}
        </div>
      )}

      {alerts.length > 0 && (
        <div className={ClassNames.alertsCard}>
          <div className={ClassNames.alertsHeader}>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className={ClassNames.alertsTitle}>{t.dashboard.alerts}</h3>
            <span className={ClassNames.alertsMonth}>{mesActual}</span>
          </div>
          <div className={ClassNames.alertsGrid}>
            {alerts.map((alert) => {
              const isSpike = alert.type === 'spike'
              const isHighShare = alert.type === 'high_share'
              const isNew = alert.type === 'new'
              const Icon = isSpike ? TrendingUp : isHighShare ? AlertTriangle : Sparkles
              const suggestion = isSpike
                ? t.dashboard.alertSuggestionSpike(alert.category)
                : isHighShare
                ? t.dashboard.alertSuggestionHighShare(alert.category)
                : t.dashboard.alertSuggestionNew(alert.category)

              return (
                <div key={alert.category} className={isSpike ? ClassNames.alertItemSpike : isHighShare ? ClassNames.alertItemHighShare : ClassNames.alertItemNew}>
                  <div className={ClassNames.alertItemRow}>
                    <div className={ClassNames.alertItemDot} style={{ backgroundColor: alert.color }} />
                    <span className={ClassNames.alertItemCat}>{alert.category}</span>
                    <Icon className={isSpike ? ClassNames.alertIconSpike : isHighShare ? ClassNames.alertIconHighShare : ClassNames.alertIconNew} />
                  </div>
                  <p className={isSpike ? ClassNames.alertMsgSpike : isHighShare ? ClassNames.alertMsgHighShare : ClassNames.alertMsgNew}>{alert.message}</p>
                  <div className={ClassNames.alertAmounts}>
                    <span>{t.dashboard.alertThisMonth} <span className="text-white font-medium">{formatARS(alert.thisMonth)}</span></span>
                    {alert.lastMonth > 0 && (
                      <span>{t.dashboard.alertLastMonth} <span className="text-gray-300">{formatARS(alert.lastMonth)}</span></span>
                    )}
                  </div>
                  <p className={ClassNames.alertSuggestion}>{suggestion}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={ClassNames.bottomGrid}>
        <div className={ClassNames.recentCard}>
          <div className={ClassNames.recentHeader}>
            <h3 className={ClassNames.recentTitle}>{t.dashboard.recentTransactions}</h3>
            <Link href="/transacciones" className={ClassNames.recentLink}>{t.common.viewAll}</Link>
          </div>

          {!recentTxs || recentTxs.length === 0 ? (
            <div className={ClassNames.emptyWrap}>
              <Receipt className="w-10 h-10 text-gray-600 mb-3" />
              <p className={ClassNames.emptyText}>{t.dashboard.noTransactions}</p>
              <Link href="/transacciones" className={ClassNames.emptyLink}>{t.dashboard.addFirstTransaction}</Link>
            </div>
          ) : (
            <div className={ClassNames.txList}>
              {(recentTxs as Transaction[]).map((tx) => (
                <div key={tx.id} className={ClassNames.txRow}>
                  <div className={ClassNames.txIconWrap} style={{ backgroundColor: `${tx.category?.color ?? '#6b7280'}20` }}>
                    <div className={ClassNames.txIconDot} style={{ backgroundColor: tx.category?.color ?? '#6b7280' }} />
                  </div>
                  <div className={ClassNames.txMeta}>
                    <p className={ClassNames.txDesc}>{tx.description || tx.category?.name || t.common.noDescription}</p>
                    <p className={ClassNames.txSub}>
                      {tx.category?.name ?? t.common.noCategory} •{' '}
                      {format(new Date(tx.date + 'T00:00:00'), 'd MMM', { locale: dateLocale })}
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

        <div className={ClassNames.quickStats}>
          <div className={ClassNames.thisMonthCard}>
            <h3 className={ClassNames.thisMonthTitle}>{t.dashboard.thisMonth}</h3>
            <div className={ClassNames.thisMonthInner}>
              <div>
                <div className={ClassNames.progressMeta}>
                  <span className={ClassNames.progressLabel}>{t.dashboard.expenseVsIncome}</span>
                  <span className={ClassNames.progressValue}>
                    {totalIngresos > 0 ? `${Math.min(Math.round((totalGastos / totalIngresos) * 100), 100)}%` : '0%'}
                  </span>
                </div>
                <div className={ClassNames.progressBar}>
                  <div
                    className={totalGastos > totalIngresos ? ClassNames.progressFillBad : ClassNames.progressFillGood}
                    style={{ width: `${totalIngresos > 0 ? Math.min((totalGastos / totalIngresos) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className={ClassNames.miniGrid}>
                <div className={ClassNames.miniCard}>
                  <p className={ClassNames.miniLabel}>{t.dashboard.transactions}</p>
                  <p className={ClassNames.miniValue}>{transactions.length}</p>
                </div>
                <div className={ClassNames.miniCard}>
                  <p className={ClassNames.miniLabel}>{t.dashboard.surplus}</p>
                  <p className={surplus > 0 ? ClassNames.miniSurplusPos : ClassNames.miniSurplusNeg}>{formatARS(surplus)}</p>
                </div>
              </div>
            </div>
          </div>

          {dolarRates.blue && (
            <div className={ClassNames.dolarCard}>
              <div className={ClassNames.dolarHeader}>
                <h3 className={ClassNames.dolarTitle}>{t.dashboard.blueDollar}</h3>
                <Link href="/dolar" className={ClassNames.dolarLink}>{t.common.viewAllM}</Link>
              </div>
              <div className={ClassNames.dolarRow}>
                <div>
                  <p className={ClassNames.dolarBuyLabel}>{t.dashboard.buy}</p>
                  <p className={ClassNames.dolarBuyValue}>{formatARS(dolarRates.blue.compra)}</p>
                </div>
                <div className="text-right">
                  <p className={ClassNames.dolarSellLabel}>{t.dashboard.sell}</p>
                  <p className={ClassNames.dolarSellValue}>{formatARS(dolarRates.blue.venta)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
