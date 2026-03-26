'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  BarChart3,
  DollarSign,
  X,
  Menu,
  LogOut,
  TrendingUp,
  RefreshCw,
  Target,
} from 'lucide-react'
import { S } from './sidebar.styles'
import { useSidebar } from './logic/useSidebar'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transacciones', label: 'Transacciones', icon: ArrowLeftRight },
  { href: '/recurrentes', label: 'Recurrentes', icon: RefreshCw },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/categorias', label: 'Categorías', icon: Tag },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/dolar', label: 'Dólar', icon: DollarSign },
]

interface SidebarProps {
  userEmail?: string
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const { mobileOpen, setMobileOpen, handleLogout } = useSidebar()

  const SidebarContent = () => (
    <div className={S.inner}>
      {/* Logo */}
      <div className={S.logoWrap}>
        <div className={S.logoIcon}>
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={S.logoTitle}>GastosApp</h1>
          <p className={S.logoSub}>Finanzas personales</p>
        </div>
      </div>

      {/* Nav */}
      <nav className={S.nav}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`${S.navLinkBase} ${isActive ? S.navLinkActive : S.navLinkInactive}`}
            >
              <Icon
                className={`${S.navIconBase} ${isActive ? S.navIconActive : S.navIconInactive}`}
              />
              {label}
              {isActive && (
                <span className={S.navActiveDot} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className={S.footer}>
        {userEmail && (
          <div className={S.footerEmail}>
            <p className={S.footerEmailText}>{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={S.logoutBtn}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={S.mobileToggle}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={S.mobileOverlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={mobileOpen ? S.mobileSidebarOpen : S.mobileSidebarClosed}>
        <button
          onClick={() => setMobileOpen(false)}
          className={S.mobileCloseBtn}
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={S.desktopSidebar}>
        <SidebarContent />
      </aside>
    </>
  )
}
