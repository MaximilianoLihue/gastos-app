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
import { ClassNames } from './sidebar.styles'
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
    <div className={ClassNames.inner}>
      {/* Logo */}
      <div className={ClassNames.logoWrap}>
        <div className={ClassNames.logoIcon}>
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={ClassNames.logoTitle}>GastosApp</h1>
          <p className={ClassNames.logoSub}>Finanzas personales</p>
        </div>
      </div>

      {/* Nav */}
      <nav className={ClassNames.nav}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`${ClassNames.navLinkBase} ${isActive ? ClassNames.navLinkActive : ClassNames.navLinkInactive}`}
            >
              <Icon
                className={`${ClassNames.navIconBase} ${isActive ? ClassNames.navIconActive : ClassNames.navIconInactive}`}
              />
              {label}
              {isActive && (
                <span className={ClassNames.navActiveDot} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className={ClassNames.footer}>
        {userEmail && (
          <div className={ClassNames.footerEmail}>
            <p className={ClassNames.footerEmailText}>{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={ClassNames.logoutBtn}
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
        className={ClassNames.mobileToggle}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={ClassNames.mobileOverlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={mobileOpen ? ClassNames.mobileSidebarOpen : ClassNames.mobileSidebarClosed}>
        <button
          onClick={() => setMobileOpen(false)}
          className={ClassNames.mobileCloseBtn}
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={ClassNames.desktopSidebar}>
        <SidebarContent />
      </aside>
    </>
  )
}
