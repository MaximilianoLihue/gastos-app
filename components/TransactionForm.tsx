'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Category, TransactionType } from '@/lib/types'
import { X, Save, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionFormProps {
  transaction?: Transaction | null
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({
  transaction,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type: (transaction?.type ?? 'gasto') as TransactionType,
    amount: transaction?.amount?.toString() ?? '',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-white font-semibold text-lg">
            {transaction ? 'Editar transacción' : 'Nueva transacción'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['ingreso', 'gasto'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    form.type === t
                      ? t === 'ingreso'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-gray-700/50 text-gray-400 border border-transparent hover:border-gray-600'
                  }`}
                >
                  {t === 'ingreso' ? 'Ingreso' : 'Gasto'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Monto (ARS)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Descripción opcional..."
              className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categoría
            </label>
            <select
              value={form.category_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category_id: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
