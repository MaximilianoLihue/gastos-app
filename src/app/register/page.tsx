'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { seedDefaultCategories } from '@/lib/defaultCategories'
import { TrendingUp, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { ClassNames } from './page.styles'

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
      <div className={ClassNames.successRoot}>
        <div className={ClassNames.successContent}>
          <div className={ClassNames.successIcon}>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className={ClassNames.successTitle}>¡Registro exitoso!</h2>
          <p className={ClassNames.successText}>
            Revisá tu email para confirmar tu cuenta. Si no ves el email, revisá tu carpeta de spam.
          </p>
          <Link
            href="/login"
            className={ClassNames.successLink}
          >
            Ir al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={ClassNames.root}>
      {/* Background decoration */}
      <div className={ClassNames.bgDecor}>
        <div className={ClassNames.bgBlobTR} />
        <div className={ClassNames.bgBlobBL} />
      </div>

      <div className={ClassNames.content}>
        {/* Logo */}
        <div className={ClassNames.logoWrap}>
          <div className={ClassNames.logoIcon}>
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className={ClassNames.appName}>GastosApp</h1>
          <p className={ClassNames.tagline}>Creá tu cuenta gratis</p>
        </div>

        {/* Card */}
        <div className={ClassNames.card}>
          <form onSubmit={handleSubmit} className={ClassNames.form}>
            {/* Email */}
            <div>
              <label className={ClassNames.label}>
                Email
              </label>
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

            {/* Password */}
            <div>
              <label className={ClassNames.label}>
                Contraseña
              </label>
              <div className={ClassNames.inputWrap}>
                <Lock className={ClassNames.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={ClassNames.inputWithToggle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={ClassNames.toggleBtn}
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
              <label className={ClassNames.label}>
                Confirmar contraseña
              </label>
              <div className={ClassNames.inputWrap}>
                <Lock className={ClassNames.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  className={ClassNames.input}
                />
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
                  Registrando...
                </>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <div className={ClassNames.cardFooter}>
            <p className={ClassNames.cardFooterText}>
              ¿Ya tenés cuenta?{' '}
              <Link
                href="/login"
                className={ClassNames.cardFooterLink}
              >
                Iniciá sesión
              </Link>
            </p>
          </div>
        </div>

        <p className={ClassNames.hint}>
          Al registrarte, se crearán categorías de ejemplo para que puedas empezar rápido.
        </p>
      </div>
    </div>
  )
}
