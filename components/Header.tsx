'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'GastosApp'

  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : '??'

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

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

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className={`w-8 h-8 rounded-full bg-emerald-500/20 border flex items-center justify-center transition-all duration-150 active:scale-90
              ${open
                ? 'border-emerald-400 ring-2 ring-emerald-500/40 ring-offset-1 ring-offset-gray-900 bg-emerald-500/30'
                : 'border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-400'
              }`}
          >
            <span className="text-emerald-400 text-xs font-bold">{initials}</span>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-white text-xs font-medium truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
