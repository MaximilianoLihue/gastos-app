'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type Lang, DEFAULT_LANG, LANG_COOKIE, getT, type Translations } from './index'

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
}

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: getT(DEFAULT_LANG),
})

export function LangProvider({
  children,
  initialLang,
}: {
  children: ReactNode
  initialLang: Lang
}) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    document.cookie = `${LANG_COOKIE}=${newLang};path=/;max-age=31536000`
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang, t: getT(lang) }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}

export function useT() {
  return useContext(LangContext).t
}
