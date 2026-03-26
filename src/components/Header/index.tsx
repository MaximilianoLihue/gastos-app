'use client'

import { usePathname } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { S } from './header.styles'
import { useHeader } from './logic/useHeader'

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
    <header className={S.root}>
      <div className={S.leftWrap}>
        <h2 className={S.title}>{title}</h2>
        <p className={S.subtitle}>
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className={S.rightWrap}>
        <button className={S.bellBtn}>
          <Bell className="w-5 h-5" />
        </button>

        <div className={S.avatarWrap} ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className={`${S.avatarBase} ${open ? S.avatarOpen : S.avatarClosed}`}
          >
            <span className={S.initials}>{initials}</span>
          </button>

          {open && (
            <div className={S.dropdown}>
              <div className={S.dropdownEmail}>
                <p className={S.dropdownEmailText}>{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className={S.dropdownLogout}
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
