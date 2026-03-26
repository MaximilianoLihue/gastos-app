import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Category, TransactionType } from '@/lib/types'
import { format } from 'date-fns'

interface UseTransactionFormProps {
  transaction?: Transaction | null
  onSuccess: () => void
}

export function useTransactionForm({ transaction, onSuccess }: UseTransactionFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type: (transaction?.type ?? 'gasto') as TransactionType,
    amount: transaction?.amount?.toString() ?? '',
    currency: (transaction?.currency ?? 'ARS') as 'ARS' | 'USD',
    description: transaction?.description ?? '',
    date: transaction?.date ?? format(new Date(), 'yyyy-MM-dd'),
    category_id: transaction?.category_id ?? '',
  })

  useEffect(() => {
    loadCategories()
  }, [form.type])

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('type', form.type)
      .order('name')
    setCategories(data ?? [])
  }

  function handleTypeChange(type: TransactionType) {
    setForm((prev) => ({ ...prev, type, category_id: '' }))
  }

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
        type: form.type,
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description || null,
        date: form.date,
        category_id: form.category_id || null,
      }

      if (transaction) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', transaction.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('transactions')
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

  return { loading, categories, error, form, setForm, handleTypeChange, handleSubmit }
}
