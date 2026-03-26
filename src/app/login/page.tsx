'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { ClassNames } from './page.styles'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
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
          <h1 className={ClassNames.appName}>GastosApp</h1>
          <p className={ClassNames.tagline}>Ingresá a tu cuenta</p>
        </div>

        <div className={ClassNames.card}>
          <form onSubmit={handleSubmit} className={ClassNames.form}>
            <div>
              <label className={ClassNames.label}>Email</label>
              <div className={ClassNames.inputWrap}>
                <Mail className={ClassNames.inputIcon} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={ClassNames.input}
                />
              </div>
            </div>

            <div>
              <label className={ClassNames.label}>Contraseña</label>
              <div className={ClassNames.inputWrap}>
                <Lock className={ClassNames.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className={ClassNames.submitBtn}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <div className={ClassNames.footer}>
            <p className={ClassNames.footerText}>
              ¿No tenés cuenta?{' '}
              <Link href="/register" className={ClassNames.footerLink}>
                Registrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
