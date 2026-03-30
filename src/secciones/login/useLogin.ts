'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/LangContext'

export function useLogin() {
  const t = useT()
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
        setError(data.error || t.login.errorDefault)
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError(t.login.errorRetry)
    } finally {
      setLoading(false)
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    loading,
    error,
    handleSubmit,
  }
}
