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
  const gastosPorCatMesAnterior = (lastMonthTxs as LastTx[] ?? [])
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
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-white text-2xl font-bold capitalize">
          {format(now, "EEEE, d 'de' MMMM", { locale: es })}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Resumen del mes de{' '}
          <span className="text-emerald-400 font-medium capitalize">{mesActual}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Ingresos */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            {ingresosChange !== 0 && (
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  ingresosChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {ingresosChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(ingresosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">Ingresos</p>
          <p className="text-white text-2xl font-bold mt-1">{formatARS(totalIngresos)}</p>
          <p className="text-gray-500 text-xs mt-1">vs mes anterior</p>
        </div>

        {/* Gastos */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            {gastosChange !== 0 && (
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  gastosChange <= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {gastosChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(gastosChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">Gastos</p>
          <p className="text-white text-2xl font-bold mt-1">{formatARS(totalGastos)}</p>
          <p className="text-gray-500 text-xs mt-1">vs mes anterior</p>
        </div>

        {/* Balance */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                balance >= 0 ? 'bg-blue-500/15' : 'bg-orange-500/15'
              }`}
            >
              <Wallet
                className={`w-5 h-5 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}
              />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Balance</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              balance >= 0 ? 'text-blue-400' : 'text-orange-400'
            }`}
          >
            {formatARS(balance)}
          </p>
          <p className="text-gray-500 text-xs mt-1">Ingresos - Gastos</p>
        </div>

        {/* USD con blue */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">USD (dólar blue)</p>
          <p className="text-amber-400 text-2xl font-bold mt-1">
            {usdPosibles.blue !== null
              ? formatUSD(usdPosibles.blue)
              : surplus <= 0
              ? 'Sin superávit'
              : 'N/D'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {dolarRates.blue
              ? `Venta: ${formatARS(dolarRates.blue.venta)}`
              : 'Cotización no disponible'}
          </p>
        </div>
      </div>

      {/* Top spending categories */}
      {topCategorias.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold">¿En qué gasto más?</h3>
            <span className="text-gray-500 text-xs capitalize">{mesActual}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topCategorias.map((cat, i) => {
              const pct = totalGastos > 0 ? (cat.total / totalGastos) * 100 : 0
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-500 text-xs w-4 flex-shrink-0">#{i + 1}</span>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-gray-300 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-white font-semibold">{formatARS(cat.total)}</span>
                      <span className="text-gray-500 text-xs ml-1.5">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {totalGastos > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between text-sm">
              <span className="text-gray-500">Total gastado este mes</span>
              <span className="text-red-400 font-semibold">{formatARS(totalGastos)}</span>
            </div>
          )}
        </div>
      )}

      {/* Spending alerts */}
      {alerts.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-semibold">Señales de gasto</h3>
            <span className="ml-auto text-gray-500 text-xs capitalize">{mesActual}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alerts.map((alert) => {
              const isSpike = alert.type === 'spike'
              const isHighShare = alert.type === 'high_share'
              const isNew = alert.type === 'new'

              const borderColor = isSpike
                ? 'border-red-500/30'
                : isHighShare
                ? 'border-amber-500/30'
                : 'border-blue-500/30'

              const bgColor = isSpike
                ? 'bg-red-500/5'
                : isHighShare
                ? 'bg-amber-500/5'
                : 'bg-blue-500/5'

              const Icon = isSpike ? TrendingUp : isHighShare ? AlertTriangle : Sparkles
              const iconColor = isSpike
                ? 'text-red-400'
                : isHighShare
                ? 'text-amber-400'
                : 'text-blue-400'

              const suggestion = isSpike
                ? `Revisá si podés reducir gastos en ${alert.category}.`
                : isHighShare
                ? `${alert.category} consume una parte grande de tu presupuesto.`
                : `Primera vez que gastás en ${alert.category} este mes.`

              return (
                <div
                  key={alert.category}
                  className={`border ${borderColor} ${bgColor} rounded-xl p-4 space-y-2`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: alert.color }}
                    />
                    <span className="text-white font-medium text-sm">{alert.category}</span>
                    <Icon className={`w-4 h-4 ml-auto flex-shrink-0 ${iconColor}`} />
                  </div>
                  <p className={`text-xs font-semibold ${iconColor}`}>{alert.message}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Este mes: <span className="text-white font-medium">{formatARS(alert.thisMonth)}</span></span>
                    {alert.lastMonth > 0 && (
                      <span>Anterior: <span className="text-gray-300">{formatARS(alert.lastMonth)}</span></span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{suggestion}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold">Últimas transacciones</h3>
            <Link
              href="/transacciones"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
            >
              Ver todas
            </Link>
          </div>

          {!recentTxs || recentTxs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Receipt className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">No hay transacciones aún</p>
              <Link
                href="/transacciones"
                className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
              >
                Agregar primera transacción
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {(recentTxs as Transaction[]).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700/30 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${tx.category?.color ?? '#6b7280'}20`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: tx.category?.color ?? '#6b7280',
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {tx.description || tx.category?.name || 'Sin descripción'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {tx.category?.name ?? 'Sin categoría'} •{' '}
                      {format(new Date(tx.date + 'T00:00:00'), 'd MMM', { locale: es })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ${
                      tx.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'ingreso' ? '+' : '-'}
                    {formatARS(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="space-y-4">
          {/* Spending progress */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Este mes</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-400">Gasto vs Ingreso</span>
                  <span className="text-gray-300">
                    {totalIngresos > 0
                      ? `${Math.min(Math.round((totalGastos / totalIngresos) * 100), 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      totalGastos > totalIngresos ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
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

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-gray-700/30 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Transacciones</p>
                  <p className="text-white font-bold text-xl">{transactions.length}</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Superávit</p>
                  <p
                    className={`font-bold text-lg ${
                      surplus > 0 ? 'text-emerald-400' : 'text-gray-500'
                    }`}
                  >
                    {formatARS(surplus)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dollar quick view */}
          {dolarRates.blue && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Dólar blue</h3>
                <Link
                  href="/dolar"
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors"
                >
                  Ver todo
                </Link>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-gray-400 text-xs">Compra</p>
                  <p className="text-white font-semibold">
                    {formatARS(dolarRates.blue.compra)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Venta</p>
                  <p className="text-emerald-400 font-bold text-xl">
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
