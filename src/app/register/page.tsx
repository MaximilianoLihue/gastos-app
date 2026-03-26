'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { seedDefaultCategories } from '@/lib/defaultCategories'
import { TrendingUp, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { ClassNames } from './page.styles'
import { useT } from '@/lib/i18n/LangContext'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useT()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t.register.errorMismatch)
      return
    }

    if (password.length < 6) {
      setError(t.register.errorTooShort)
      return
    }

    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError(t.register.errorAlreadyRegistered)
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        await seedDefaultCategories(supabase, data.user.id)
      }

      setSuccess(true)

      if (data.session) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError(t.register.errorDefault)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={ClassNames.successRoot}>
        <div className={ClassNames.successContent}>
          <div className={ClassNames.successIcon}>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className={ClassNames.successTitle}>{t.register.successTitle}</h2>
          <p className={ClassNames.successText}>{t.register.successText}</p>
          <Link href="/login" className={ClassNames.successLink}>
            {t.register.successLink}
          </Link>
        </div>
      </div>
    )
  }

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
          <p className={ClassNames.tagline}>{t.register.tagline}</p>
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
                  placeholder={t.register.passwordPlaceholder}
                  className={ClassNames.inputWithToggle}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={ClassNames.toggleBtn}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={ClassNames.label}>{t.register.confirmLabel}</label>
              <div className={ClassNames.inputWrap}>
                <Lock className={ClassNames.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.register.confirmPlaceholder}
                  className={ClassNames.input}
                />
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
                  {t.register.submitting}
                </>
              ) : (
                t.register.submitBtn
              )}
            </button>
          </form>

          <div className={ClassNames.cardFooter}>
            <p className={ClassNames.cardFooterText}>
              {t.register.alreadyHaveAccount}{' '}
              <Link href="/login" className={ClassNames.cardFooterLink}>
                {t.register.signIn}
              </Link>
            </p>
          </div>
        </div>

        <p className={ClassNames.hint}>{t.register.hint}</p>
      </div>
    </div>
  )
}
