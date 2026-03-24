'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transacciones': 'Transacciones',
  '/categorias': 'Categorías',
  '/reportes': 'Reportes',
  '/dolar': 'Cotización del Dólar',
}

interface HeaderProps {
  userEmail?: string
}

export default function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname()

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'GastosApp'

  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : '??'

  return (
    <header className="h-16 bg-gray-800/50 border-b border-gray-700/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="lg:ml-0 ml-10">
        <h2 className="text-white font-semibold text-lg">{title}</h2>
        <p className="text-gray-400 text-xs hidden sm:block">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-emerald-400 text-xs font-bold">{initials}</span>
        </div>
      </div>
    </header>
  )
}
