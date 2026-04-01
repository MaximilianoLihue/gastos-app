'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, parse, startOfMonth } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useLang } from '@/lib/i18n/LangContext'

interface MonthNavProps {
  currentMonth: string // format: 'yyyy-MM'
}

export function MonthNav({ currentMonth }: MonthNavProps) {
  const router = useRouter()
  const { lang } = useLang()
  const dateLocale = lang === 'en' ? enUS : es

  const date = parse(currentMonth, 'yyyy-MM', new Date())
  const now = startOfMonth(new Date())
  const isCurrentMonth = format(now, 'yyyy-MM') === currentMonth

  function navigate(direction: 'prev' | 'next') {
    const next = direction === 'prev' ? subMonths(date, 1) : addMonths(date, 1)
    router.push(`/dashboard?month=${format(next, 'yyyy-MM')}`)
  }

  const label = lang === 'en'
    ? format(date, 'MMMM yyyy', { locale: dateLocale })
    : format(date, "MMMM 'de' yyyy", { locale: dateLocale })

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('prev')}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="w-4 h-4 text-gray-400" />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-white font-semibold capitalize text-sm min-w-[140px] text-center">
          {label}
        </span>
        {isCurrentMonth && (
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            {lang === 'en' ? 'Now' : 'Hoy'}
          </span>
        )}
      </div>

      <button
        onClick={() => navigate('next')}
        disabled={isCurrentMonth}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  )
}
