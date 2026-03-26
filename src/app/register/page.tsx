'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { seedDefaultCategories } from '@/lib/defaultCategories'
import { TrendingUp, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { S } from './page.styles'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

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
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este email ya está registrado')
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        await seedDefaultCategories(supabase, data.user.id)
      }

      setSuccess(true)

      // If email confirmation is disabled, redirect right away
      if (data.session) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Error al registrarse. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={S.successRoot}>
        <div className={S.successContent}>
          <div className={S.successIcon}>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className={S.successTitle}>¡Registro exitoso!</h2>
          <p className={S.successText}>
            Revisá tu email para confirmar tu cuenta. Si no ves el email, revisá tu carpeta de spam.
          </p>
          <Link
            href="/login"
            className={S.successLink}
          >
            Ir al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={S.root}>
      {/* Background decoration */}
      <div className={S.bgDecor}>
        <div className={S.bgBlobTR} />
        <div className={S.bgBlobBL} />
      </div>

      <div className={S.content}>
        {/* Logo */}
        <div className={S.logoWrap}>
          <div className={S.logoIcon}>
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className={S.appName}>GastosApp</h1>
          <p className={S.tagline}>Creá tu cuenta gratis</p>
        </div>

        {/* Card */}
        <div className={S.card}>
          <form onSubmit={handleSubmit} className={S.form}>
            {/* Email */}
            <div>
              <label className={S.label}>
                Email
              </label>
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

            {/* Password */}
            <div>
              <label className={S.label}>
                Contraseña
              </label>
              <div className={S.inputWrap}>
                <Lock className={S.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={S.inputWithToggle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={S.toggleBtn}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={S.label}>
                Confirmar contraseña
              </label>
              <div className={S.inputWrap}>
                <Lock className={S.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  className={S.input}
                />
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
                  Registrando...
                </>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <div className={S.cardFooter}>
            <p className={S.cardFooterText}>
              ¿Ya tenés cuenta?{' '}
              <Link
                href="/login"
                className={S.cardFooterLink}
              >
                Iniciá sesión
              </Link>
            </p>
          </div>
        </div>

        <p className={S.hint}>
          Al registrarte, se crearán categorías de ejemplo para que puedas empezar rápido.
        </p>
      </div>
    </div>
  )
}
