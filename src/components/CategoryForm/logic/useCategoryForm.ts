import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category, TransactionType } from '@/lib/types'

interface UseCategoryFormProps {
  category?: Category | null
  onSuccess: () => void
}

export function useCategoryForm({ category, onSuccess }: UseCategoryFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: category?.name ?? '',
    color: category?.color ?? '#10b981',
    type: (category?.type ?? 'gasto') as TransactionType,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('No autenticado')
        return
      }

      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        color: form.color,
        type: form.type,
      }

      if (category) {
        const { error: updateError } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', category.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert(payload)
        if (insertError) throw insertError
      }

      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, form, setForm, handleSubmit }
}
