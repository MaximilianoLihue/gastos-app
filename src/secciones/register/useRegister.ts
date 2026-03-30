'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { seedDefaultCategories } from '@/lib/defaultCategories'
import { useT } from '@/lib/i18n/LangContext'

export function useRegister() {
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
        setError(
          authError.message.includes('already registered')
            ? t.register.errorAlreadyRegistered
            : authError.message
        )
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

  return {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    loading,
    error,
    success,
    handleSubmit,
  }
}
