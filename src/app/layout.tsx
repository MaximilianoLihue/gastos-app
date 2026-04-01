import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import ServiceWorkerRegister from '@/components/ui/ServiceWorkerRegister'
import { RootProviders } from './providers'
import { type Lang, LANG_COOKIE, DEFAULT_LANG } from '@/lib/i18n/index'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'GastosApp',
  description: 'Control de finanzas personales',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GastosApp',
    startupImage: '/icons/icon-512.png',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const lang = (cookieStore.get(LANG_COOKIE)?.value ?? DEFAULT_LANG) as Lang

  return (
    <html lang={lang} className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-900 antialiased">
        <RootProviders initialLang={lang}>
          {children}
          <ServiceWorkerRegister />
        </RootProviders>
      </body>
    </html>
  )
}
