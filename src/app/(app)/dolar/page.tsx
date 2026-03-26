import { createClient } from '@/lib/supabase/server'
import { fetchAllDolarRates, calcularUSDPosibles } from '@/lib/dolar'
import DollarCard from '@/components/DollarCard'
import { DollarSign, RefreshCw, TrendingUp, Info } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
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

export default async function DolarPage() {
  const supabase = await createClient()
  const now = new Date()

  // Fetch all dollar rates
  const rates = await fetchAllDolarRates()

  // Fetch user's current month stats
  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, type')
    .gte('date', format(startOfMonth(now), 'yyyy-MM-dd'))
    .lte('date', format(endOfMonth(now), 'yyyy-MM-dd'))

  const transactions = txs ?? []
  const totalIngresos = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalGastos = transactions
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const surplus = Math.max(0, totalIngresos - totalGastos)

  const usdPosibles = calcularUSDPosibles(surplus, rates)

  const ratesConfig = [
    {
      key: 'oficial' as const,
      title: 'Dólar Oficial',
      badge: 'BNA',
      highlight: false,
    },
    {
      key: 'blue' as const,
      title: 'Dólar Blue',
      badge: undefined,
      highlight: true,
    },
    {
      key: 'mep' as const,
      title: 'Dólar MEP',
      badge: 'Bolsa',
      highlight: false,
    },
    {
      key: 'ccl' as const,
      title: 'Contado con Liquidación',
      badge: 'CCL',
      highlight: false,
    },
    {
      key: 'cripto' as const,
      title: 'Dólar Cripto',
      badge: 'USDT',
      highlight: false,
    },
  ]

  return (
    <div className={ClassNames.root}>
      {/* Header */}
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>Cotización del Dólar</h1>
          <p className={ClassNames.pageSub}>
            <RefreshCw className="w-3.5 h-3.5" />
            Datos actualizados automáticamente vía{' '}
            <a
              href="https://dolarapi.com"
              target="_blank"
              rel="noopener noreferrer"
              className={ClassNames.pageSubLink}
            >
              dolarapi.com
            </a>
          </p>
        </div>
        <div className={ClassNames.lastUpdatedWrap}>
          <p className={ClassNames.lastUpdatedLabel}>Última actualización</p>
          <p className={ClassNames.lastUpdatedValue}>
            {format(now, "HH:mm 'hs'", { locale: es })}
          </p>
        </div>
      </div>

      {/* Dollar rates grid */}
      <div className={ClassNames.ratesGrid}>
        {ratesConfig.map(({ key, title, badge, highlight }) => (
          <DollarCard
            key={key}
            title={title}
            rate={rates[key]}
            badge={badge}
            highlight={highlight}
          />
        ))}
      </div>

      {/* Spread comparison */}
      {rates.oficial && rates.blue && (
        <div className={ClassNames.spreadCard}>
          <h3 className={ClassNames.spreadTitle}>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Brecha cambiaria
          </h3>
          <div className={ClassNames.spreadGrid}>
            {[
              {
                label: 'Blue vs Oficial',
                diff: rates.blue!.venta - rates.oficial!.venta,
                pct: ((rates.blue!.venta - rates.oficial!.venta) / rates.oficial!.venta) * 100,
                color: 'text-blue-400',
              },
              ...(rates.mep
                ? [{
                    label: 'MEP vs Oficial',
                    diff: rates.mep.venta - rates.oficial!.venta,
                    pct: ((rates.mep.venta - rates.oficial!.venta) / rates.oficial!.venta) * 100,
                    color: 'text-purple-400',
                  }]
                : []),
              ...(rates.ccl
                ? [{
                    label: 'CCL vs Oficial',
                    diff: rates.ccl.venta - rates.oficial!.venta,
                    pct: ((rates.ccl.venta - rates.oficial!.venta) / rates.oficial!.venta) * 100,
                    color: 'text-amber-400',
                  }]
                : []),
              ...(rates.cripto
                ? [{
                    label: 'Cripto vs Oficial',
                    diff: rates.cripto.venta - rates.oficial!.venta,
                    pct: ((rates.cripto.venta - rates.oficial!.venta) / rates.oficial!.venta) * 100,
                    color: 'text-pink-400',
                  }]
                : []),
            ].map((item, i) => (
              <div key={i} className={ClassNames.spreadItem}>
                <p className={ClassNames.spreadItemLabel}>{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>
                  +{item.pct.toFixed(1)}%
                </p>
                <p className={ClassNames.spreadItemSub}>
                  +{formatARS(item.diff)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USD with surplus */}
      <div className={ClassNames.usdCard}>
        <h3 className={ClassNames.usdTitle}>
          <DollarSign className="w-4 h-4 text-emerald-400" />
          ¿Cuántos dólares podés comprar?
        </h3>
        <p className={ClassNames.usdSub}>
          Calculado con tu superávit del mes actual:{' '}
          <span className={surplus > 0 ? ClassNames.usdSurplusPos : ClassNames.usdSurplusNeg}>
            {formatARS(surplus)}
          </span>
        </p>

        {surplus <= 0 ? (
          <div className={ClassNames.noSurplusBox}>
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className={ClassNames.noSurplusText}>
              Tu superávit este mes es ${formatARS(totalIngresos - totalGastos)}. Para poder calcular cuántos
              dólares podés comprar, tus ingresos deben superar tus gastos.
            </p>
          </div>
        ) : (
          <div className={ClassNames.usdGrid}>
            {[
              {
                label: 'Al dólar oficial',
                usd: surplus / (rates.oficial?.venta ?? 1),
                rate: rates.oficial?.venta,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10 border-blue-500/20',
                available: !!rates.oficial,
              },
              {
                label: 'Al dólar blue',
                usd: surplus / (rates.blue?.venta ?? 1),
                rate: rates.blue?.venta,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10 border-emerald-500/20',
                available: !!rates.blue,
              },
              {
                label: 'Al dólar MEP',
                usd: surplus / (rates.mep?.venta ?? 1),
                rate: rates.mep?.venta,
                color: 'text-purple-400',
                bg: 'bg-purple-500/10 border-purple-500/20',
                available: !!rates.mep,
              },
              {
                label: 'Al dólar CCL',
                usd: surplus / (rates.ccl?.venta ?? 1),
                rate: rates.ccl?.venta,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10 border-amber-500/20',
                available: !!rates.ccl,
              },
            ]
              .filter((item) => item.available)
              .map((item, i) => (
                <div
                  key={i}
                  className={`${ClassNames.usdItem} ${item.bg}`}
                >
                  <p className={ClassNames.usdItemLabel}>{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>
                    {formatUSD(item.usd)}
                  </p>
                  <p className={ClassNames.usdItemSub}>
                    Venta: {formatARS(item.rate ?? 0)}
                  </p>
                </div>
              ))}
          </div>
        )}

        <div className={ClassNames.usdFootnote}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>
            Cálculo informativo: Superávit ÷ precio de venta. Las operaciones en dólar
            blue son informales. El cupo oficial es de USD 200 mensuales.
          </p>
        </div>
      </div>
    </div>
  )
}
