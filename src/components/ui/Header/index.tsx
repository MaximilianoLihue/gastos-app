'use client'

import { usePathname } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { ClassNames } from './header.styles'
import { useHeader } from '@/LogicService/ui/Header/useHeader'

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
  const { open, setOpen, ref, handleLogout } = useHeader()

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'GastosApp'

  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : '??'

  return (
    <header className={ClassNames.root}>
      <div className={ClassNames.leftWrap}>
        <h2 className={ClassNames.title}>{title}</h2>
        <p className={ClassNames.subtitle}>
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className={ClassNames.rightWrap}>
        <button className={ClassNames.bellBtn}>
          <Bell className="w-5 h-5" />
        </button>

        <div className={ClassNames.avatarWrap} ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className={`${ClassNames.avatarBase} ${open ? ClassNames.avatarOpen : ClassNames.avatarClosed}`}
          >
            <span className={ClassNames.initials}>{initials}</span>
          </button>

          {open && (
            <div className={ClassNames.dropdown}>
              <div className={ClassNames.dropdownEmail}>
                <p className={ClassNames.dropdownEmailText}>{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className={ClassNames.dropdownLogout}
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
