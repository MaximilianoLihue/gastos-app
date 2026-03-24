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

  // Fetch transactions for last month (for comparison)
  const { data: lastMonthTxs } = await supabase
    .from('transactions')
    .select('amount, type')
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
