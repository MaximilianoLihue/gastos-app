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
  Languages,
} from 'lucide-react'
import { ClassNames } from './sidebar.styles'
import { useSidebar } from './logic/useSidebar'
import { useLang } from '@/lib/i18n/LangContext'

interface SidebarProps {
  userEmail?: string
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const { mobileOpen, setMobileOpen, handleLogout } = useSidebar()
  const { lang, setLang, t } = useLang()

  const navItems = [
    { href: '/dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { href: '/transacciones', label: t.sidebar.transactions, icon: ArrowLeftRight },
    { href: '/recurrentes', label: t.sidebar.recurring, icon: RefreshCw },
    { href: '/metas', label: t.sidebar.goals, icon: Target },
    { href: '/categorias', label: t.sidebar.categories, icon: Tag },
    { href: '/reportes', label: t.sidebar.reports, icon: BarChart3 },
    { href: '/dolar', label: t.sidebar.dollar, icon: DollarSign },
  ]

  const SidebarContent = () => (
    <div className={ClassNames.inner}>
      <div className={ClassNames.logoWrap}>
        <div className={ClassNames.logoIcon}>
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={ClassNames.logoTitle}>{t.appName}</h1>
          <p className={ClassNames.logoSub}>{t.appTagline}</p>
        </div>
      </div>

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
              <Icon className={`${ClassNames.navIconBase} ${isActive ? ClassNames.navIconActive : ClassNames.navIconInactive}`} />
              {label}
              {isActive && <span className={ClassNames.navActiveDot} />}
            </Link>
          )
        })}
      </nav>

      <div className={ClassNames.footer}>
        {userEmail && (
          <div className={ClassNames.footerEmail}>
            <p className={ClassNames.footerEmailText}>{userEmail}</p>
          </div>
        )}

        <div className={ClassNames.langToggleWrap}>
          <Languages className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <button onClick={() => setLang('es')} className={lang === 'es' ? ClassNames.langBtnActive : ClassNames.langBtnInactive}>ES</button>
          <span className={ClassNames.langDivider}>|</span>
          <button onClick={() => setLang('en')} className={lang === 'en' ? ClassNames.langBtnActive : ClassNames.langBtnInactive}>EN</button>
        </div>

        <button onClick={handleLogout} className={ClassNames.logoutBtn}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {t.sidebar.signOut}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className={ClassNames.mobileToggle} aria-label={t.sidebar.openMenu}>
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && <div className={ClassNames.mobileOverlay} onClick={() => setMobileOpen(false)} />}

      <aside className={mobileOpen ? ClassNames.mobileSidebarOpen : ClassNames.mobileSidebarClosed}>
        <button onClick={() => setMobileOpen(false)} className={ClassNames.mobileCloseBtn} aria-label={t.sidebar.closeMenu}>
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      <aside className={ClassNames.desktopSidebar}>
        <SidebarContent />
      </aside>
    </>
  )
}
