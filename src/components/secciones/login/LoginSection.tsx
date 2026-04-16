'use client'

import Link from 'next/link'
import { TrendingUp, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { ClassNames } from './loginSection.styles'
import { useT } from '@/lib/i18n/LangContext'
import { useLogin } from '@/LogicService/secciones/login/useLogin'

export function LoginSection() {
  const t = useT()
  const {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    loading,
    error,
    handleSubmit,
  } = useLogin()

  return (
    <div className={ClassNames.root}>
      <div className={ClassNames.bgDecor}>
        <div className={ClassNames.bgBlobTR} />
        <div className={ClassNames.bgBlobBL} />
      </div>

      <div className={ClassNames.content}>
        <div className={ClassNames.logoWrap}>
          <div className={ClassNames.logoIcon}>
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className={ClassNames.appName}>{t.appName}</h1>
          <p className={ClassNames.tagline}>{t.login.tagline}</p>
        </div>

        <div className={ClassNames.card}>
          <form onSubmit={handleSubmit} className={ClassNames.form}>
            <div>
              <label className={ClassNames.label}>{t.login.emailLabel}</label>
              <div className={ClassNames.inputWrap}>
                <Mail className={ClassNames.inputIcon} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.login.emailPlaceholder}
                  className={ClassNames.input}
                />
              </div>
            </div>

            <div>
              <label className={ClassNames.label}>{t.login.passwordLabel}</label>
              <div className={ClassNames.inputWrap}>
                <Lock className={ClassNames.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  className={ClassNames.inputWithToggle}
                />
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); setShowPassword(v => !v) }}
                  className={ClassNames.toggleBtn}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={ClassNames.errorWrap}>
                <p className={ClassNames.errorText}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className={ClassNames.submitBtn}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.login.submitting}
                </>
              ) : (
                t.login.submitBtn
              )}
            </button>
          </form>

          <div className={ClassNames.footer}>
            <p className={ClassNames.footerText}>
              {t.login.noAccount}{' '}
              <Link href="/register" className={ClassNames.footerLink}>
                {t.login.register}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
