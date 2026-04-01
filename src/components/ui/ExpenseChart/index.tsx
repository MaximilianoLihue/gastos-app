'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import { MonthlyData, CategoryData } from '@/lib/types'
import { useExpenseChart } from '@/LogicService/ui/ExpenseChart/useExpenseChart'

interface BarLineChartProps {
  data: MonthlyData[]
  chartType: 'bar' | 'line'
}

interface PieChartComponentProps {
  data: CategoryData[]
}

const axisStyle = { fill: '#9ca3af', fontSize: 12 }
const axisStyleSm = { fill: '#9ca3af', fontSize: 11 }
const gridProps = { strokeDasharray: '3 3', stroke: '#374151', vertical: false as const }
const legendStyle = { color: '#9ca3af', fontSize: '12px' }

export function BarLineChart({ data, chartType }: BarLineChartProps) {
  const { formatARS, formatCurrencyFull } = useExpenseChart()

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No hay datos para mostrar</div>
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl">
        <p className="text-gray-300 text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrencyFull(entry.value)}
          </p>
        ))}
      </div>
    )
  }

  const commonProps = { data, margin: { top: 5, right: 10, left: 10, bottom: 5 } }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === 'bar' ? (
        <BarChart {...commonProps}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatARS} tick={axisStyleSm} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={legendStyle} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart {...commonProps}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatARS} tick={axisStyleSm} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2.5}
            dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2.5}
            dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  )
}

export function PieChartComponent({ data }: PieChartComponentProps) {
  const { formatCurrency, formatCurrencyFull, renderCustomizedLabel } = useExpenseChart()

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No hay datos para mostrar</div>
  }

  const PieTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; payload: { color: string } }>
  }) => {
    if (!active || !payload?.length) return null
    const item = payload[0]
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl">
        <p className="text-gray-300 text-sm font-medium">{item.name}</p>
        <p className="text-sm" style={{ color: item.payload.color }}>{formatCurrencyFull(item.value)}</p>
      </div>
    )
  }

  const CustomLabel = (props: {
    cx?: number; cy?: number; midAngle?: number
    innerRadius?: number; outerRadius?: number; percent?: number
  }) => {
    const result = renderCustomizedLabel(props)
    if (!result) return null
    return (
      <text x={result.x} y={result.y} fill="white" textAnchor="middle"
        dominantBaseline="central" fontSize={11} fontWeight={600}>
        {result.label}
      </text>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" labelLine={false}
            label={CustomLabel} outerRadius={110} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 min-w-[160px]">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-300 text-sm truncate">{entry.name}</span>
            <span className="text-gray-500 text-xs ml-auto">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
