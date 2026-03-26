'use client'

import { LangProvider } from '@/lib/i18n/LangContext'
import { type Lang } from '@/lib/i18n/index'

export function RootProviders({
  children,
  initialLang,
}: {
  children: React.ReactNode
  initialLang: Lang
}) {
  return <LangProvider initialLang={initialLang}>{children}</LangProvider>
}
