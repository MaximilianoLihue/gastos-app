'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { S } from './page.styles'

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
    <div className={S.root}>
      <div className={S.bgDecor}>
        <div className={S.bgBlobTR} />
        <div className={S.bgBlobBL} />
      </div>

      <div className={S.content}>
        <div className={S.logoWrap}>
          <div className={S.logoIcon}>
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className={S.appName}>GastosApp</h1>
          <p className={S.tagline}>Ingresá a tu cuenta</p>
        </div>

        <div className={S.card}>
          <form onSubmit={handleSubmit} className={S.form}>
            <div>
              <label className={S.label}>Email</label>
              <div className={S.inputWrap}>
                <Mail className={S.inputIcon} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={S.input}
                />
              </div>
            </div>

            <div>
              <label className={S.label}>Contraseña</label>
              <div className={S.inputWrap}>
                <Lock className={S.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={S.inputWithToggle}
                />
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); setShowPassword(v => !v) }}
                  className={S.toggleBtn}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={S.errorWrap}>
                <p className={S.errorText}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={S.submitBtn}
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

          <div className={S.footer}>
            <p className={S.footerText}>
              ¿No tenés cuenta?{' '}
              <Link href="/register" className={S.footerLink}>
                Registrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
