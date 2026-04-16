'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Activity, ArrowUp, ArrowDown, Minus, AlertTriangle, BarChart2, List } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from 'recharts'
import { ClassNames } from './tendenciasSection.styles'
import { useLang } from '@/lib/i18n/LangContext'
import { useTendencias, CategoryTrend } from '@/LogicService/secciones/tendencias/useTendencias'

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

function formatARSShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function pctLabel(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function TrendItem({ item, direction }: { item: CategoryTrend; direction: 'up' | 'down' }) {
  const barWidth = Math.min(Math.abs(item.pctChange), 100)
  return (
    <div>
      <div className={ClassNames.trendRow}>
        <div className={ClassNames.trendDot} style={{ backgroundColor: item.color }} />
        <span className={ClassNames.trendName}>{item.name}</span>
        <div className={ClassNames.trendAmounts}>
          <span className={direction === 'up' ? ClassNames.trendPctUp : ClassNames.trendPctDown}>
            {pctLabel(item.pctChange)}
          </span>
          <p className={ClassNames.trendAmountSub}>{formatARS(item.currAmount)}</p>
        </div>
        {direction === 'up'
          ? <ArrowUp className={ClassNames.trendArrowUp} />
          : <ArrowDown className={ClassNames.trendArrowDown} />}
      </div>
      <div className={ClassNames.trendBarWrap}>
        <div
          className={direction === 'up' ? ClassNames.trendBarUp : ClassNames.trendBarDown}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}

function TrendChart({ items, direction }: { items: CategoryTrend[]; direction: 'up' | 'down' }) {
  const { lang } = useLang()
  const labelPrev = lang === 'en' ? 'Previous' : 'Anterior'
  const labelCurr = lang === 'en' ? 'Current' : 'Actual'

  const data = items.map(item => ({
    name: item.name.length > 10 ? item.name.slice(0, 9) + '…' : item.name,
    fullName: item.name,
    anterior: item.prevAmount,
    actual: item.currAmount,
    color: item.color,
    pctChange: item.pctChange,
  }))

  const TrendTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; fill: string }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    const item = data.find(d => d.name === label)
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl min-w-[160px]">
        <p className="text-gray-300 text-xs font-medium mb-2">{item?.fullName ?? label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex justify-between gap-4 text-xs">
            <span style={{ color: entry.fill }}>{entry.name}</span>
            <span className="text-white font-medium">{formatARS(entry.value)}</span>
          </div>
        ))}
        <div className={`mt-2 pt-2 border-t border-gray-700 text-xs font-semibold ${direction === 'up' ? 'text-red-400' : 'text-emerald-400'}`}>
          {pctLabel(item?.pctChange ?? 0)}
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={items.length * 52 + 20}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
        barCategoryGap="30%"
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#9ca3af', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatARSShort}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: '#d1d5db', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="anterior" name={labelPrev} radius={[0, 3, 3, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.25} />
          ))}
        </Bar>
        <Bar dataKey="actual" name={labelCurr} radius={[0, 3, 3, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
          <LabelList
            dataKey="actual"
            position="right"
            formatter={(v: unknown) => formatARSShort(Number(v))}
            style={{ fill: '#9ca3af', fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function TrendCard({
  direction,
  items,
  loading,
  title,
  emptyText,
}: {
  direction: 'up' | 'down'
  items: CategoryTrend[]
  loading: boolean
  title: string
  emptyText: string
}) {
  const { t } = useLang()
  const [showChart, setShowChart] = useState(false)

  return (
    <div className={ClassNames.trendsCard}>
      <div className={ClassNames.trendsHeader}>
        <div className={ClassNames.trendsHeaderLeft}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${direction === 'up' ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
            {direction === 'up'
              ? <TrendingUp className="w-4 h-4 text-red-400" />
              : <TrendingDown className="w-4 h-4 text-emerald-400" />}
          </div>
          <h3 className={ClassNames.trendsTitle}>{title}</h3>
        </div>
        {!loading && items.length > 0 && (
          <button
            onClick={() => setShowChart(v => !v)}
            className={showChart ? ClassNames.trendsToggleBtnActive : ClassNames.trendsToggleBtn}
          >
            {showChart
              ? <><List className="w-3.5 h-3.5" />{t.tendencias.viewList}</>
              : <><BarChart2 className="w-3.5 h-3.5" />{t.tendencias.viewChart}</>}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-3.5 bg-gray-700 rounded w-3/4" />
              <div className="h-1 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className={ClassNames.trendsEmpty}>{emptyText}</p>
      ) : showChart ? (
        <div className={ClassNames.trendsChartDivider}>
          <TrendChart items={items} direction={direction} />
        </div>
      ) : (
        <div className={ClassNames.trendsList}>
          {items.map(item => (
            <TrendItem key={item.name} item={item} direction={direction} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TendenciasSection() {
  const { t, lang } = useLang()
  const {
    loading,
    inflacionLoading,
    inflacionError,
    subieron,
    bajaron,
    inflacionData,
    lastInflacion,
    acumuladoAnual,
    totalCurr,
    totalPrev,
    totalPctChange,
    currMonthLabel,
    prevMonthLabel,
  } = useTendencias()

  const txAboveInflacion = totalPctChange !== null && lastInflacion !== null
    ? totalPctChange > lastInflacion
    : null

  const axisStyle = { fill: '#9ca3af', fontSize: 11 }
  const gridProps = { strokeDasharray: '3 3', stroke: '#374151', vertical: false as const }

  const InflacionTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl">
        <p className="text-gray-300 text-xs mb-1">{label}</p>
        <p className="text-amber-400 font-semibold text-sm">{payload[0].value.toFixed(1)}%</p>
      </div>
    )
  }

  return (
    <div className={ClassNames.root}>
      {/* Header */}
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>{t.tendencias.title}</h1>
          <p className={ClassNames.pageSub}>{t.tendencias.sub}</p>
          {!loading && (
            <p className={ClassNames.monthBadge}>
              {t.tendencias.comparing(prevMonthLabel, currMonthLabel)}
            </p>
          )}
        </div>
      </div>

      {/* Comparison banner */}
      <div className={ClassNames.bannerGrid}>
        <div className={ClassNames.bannerCard}>
          <div className={loading
            ? ClassNames.bannerIconBlue
            : totalPctChange === null ? ClassNames.bannerIconBlue
            : totalPctChange > 0 ? ClassNames.bannerIconRed : ClassNames.bannerIconGreen}>
            {loading ? (
              <Activity className="w-4 h-4 text-blue-400" />
            ) : totalPctChange === null ? (
              <Activity className="w-4 h-4 text-blue-400" />
            ) : totalPctChange > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <p className={ClassNames.bannerLabel}>{t.tendencias.yourExpenses}</p>
          {loading ? (
            <div className="animate-pulse"><div className="h-6 bg-gray-700 rounded w-32 mt-1" /></div>
          ) : (
            <>
              <p className={ClassNames.bannerValue}>{formatARS(totalCurr)}</p>
              {totalPctChange !== null && (
                <p className={totalPctChange > 0 ? ClassNames.trendPctUp : ClassNames.trendPctDown}>
                  {pctLabel(totalPctChange)} {t.tendencias.vsLastMonth}
                </p>
              )}
              {totalPrev > 0 && (
                <p className={ClassNames.bannerSub}>{t.tendencias.prevMonth}: {formatARS(totalPrev)}</p>
              )}
            </>
          )}
        </div>

        <div className={ClassNames.bannerCard}>
          <div className={ClassNames.bannerIconAmber}>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className={ClassNames.bannerLabel}>{t.tendencias.lastInflacion}</p>
          {inflacionLoading ? (
            <div className="animate-pulse"><div className="h-6 bg-gray-700 rounded w-20 mt-1" /></div>
          ) : inflacionError ? (
            <p className="text-gray-500 text-sm">{t.tendencias.inflacionError}</p>
          ) : (
            <>
              <p className={ClassNames.bannerValueAmber}>
                {lastInflacion !== null ? `${lastInflacion.toFixed(1)}%` : '—'}
              </p>
              <p className={ClassNames.bannerSub}>{t.tendencias.indecSource}</p>
            </>
          )}
        </div>

        <div className={ClassNames.bannerCard}>
          <div className={txAboveInflacion === null
            ? ClassNames.bannerIconBlue
            : txAboveInflacion ? ClassNames.bannerIconRed : ClassNames.bannerIconGreen}>
            {txAboveInflacion === null
              ? <Minus className="w-4 h-4 text-blue-400" />
              : txAboveInflacion
              ? <AlertTriangle className="w-4 h-4 text-red-400" />
              : <TrendingDown className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className={ClassNames.bannerLabel}>{t.tendencias.vsInflacion}</p>
          {loading || inflacionLoading ? (
            <div className="animate-pulse"><div className="h-6 bg-gray-700 rounded w-28 mt-1" /></div>
          ) : txAboveInflacion === null ? (
            <p className={ClassNames.bannerValue}>—</p>
          ) : txAboveInflacion ? (
            <>
              <p className={ClassNames.bannerValueRed}>{t.tendencias.above}</p>
              <span className={ClassNames.bannerVerdictAbove}>
                <ArrowUp className="w-3 h-3" />
                {t.tendencias.aboveDetail(pctLabel(totalPctChange!), `${lastInflacion!.toFixed(1)}%`)}
              </span>
            </>
          ) : (
            <>
              <p className={ClassNames.bannerValueGreen}>{t.tendencias.below}</p>
              <span className={ClassNames.bannerVerdictBelow}>
                <ArrowDown className="w-3 h-3" />
                {t.tendencias.belowDetail(pctLabel(totalPctChange!), `${lastInflacion!.toFixed(1)}%`)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Category trends */}
      <div className={ClassNames.trendsGrid}>
        <TrendCard
          direction="up"
          items={subieron}
          loading={loading}
          title={t.tendencias.wentUp}
          emptyText={t.tendencias.noDataUp}
        />
        <TrendCard
          direction="down"
          items={bajaron}
          loading={loading}
          title={t.tendencias.wentDown}
          emptyText={t.tendencias.noDataDown}
        />
      </div>

      {/* Inflation chart */}
      <div className={ClassNames.inflacionCard}>
        <div className={ClassNames.inflacionHeader}>
          <div>
            <h3 className={ClassNames.inflacionTitle}>{t.tendencias.inflacionTitle}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{t.tendencias.inflacionSub}</p>
          </div>
          {!inflacionLoading && !inflacionError && (
            <div className={ClassNames.inflacionStats}>
              {lastInflacion !== null && (
                <div className="text-right">
                  <p className={ClassNames.inflacionStatLabel}>{t.tendencias.lastMonth}</p>
                  <p className="text-amber-400 font-bold text-lg">{lastInflacion.toFixed(1)}%</p>
                </div>
              )}
              {acumuladoAnual !== null && (
                <div className="text-right">
                  <p className={ClassNames.inflacionStatLabel}>{t.tendencias.accumulated12}</p>
                  <p className="text-orange-400 font-bold text-lg">{acumuladoAnual.toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}
        </div>

        {inflacionLoading ? (
          <div className={ClassNames.inflacionLoading}>
            <div className={ClassNames.spinner} />
          </div>
        ) : inflacionError ? (
          <div className={ClassNames.inflacionError}>{t.tendencias.inflacionFetchError}</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={inflacionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip content={<InflacionTooltip />} />
              <ReferenceLine
                y={lastInflacion ?? undefined}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
              />
              <Line
                type="monotone"
                dataKey="valor"
                name={lang === 'en' ? 'Inflation' : 'Inflación'}
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: '#f59e0b', r: 3 }}
                activeDot={{ r: 5, fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
