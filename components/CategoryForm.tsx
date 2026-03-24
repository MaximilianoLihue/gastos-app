'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category, TransactionType } from '@/lib/types'
import { X, Save, Loader2 } from 'lucide-react'

interface CategoryFormProps {
  category?: Category | null
  onSuccess: () => void
  onCancel: () => void
}

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#0ea5e9', '#eab308',
]

export default function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-white font-semibold text-lg">
            {category ? 'Editar categoría' : 'Nueva categoría'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ej: Supermercado, Sueldo..."
              className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['ingreso', 'gasto'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: t }))}
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

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  style={{ backgroundColor: color }}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    form.color === color
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110'
                      : 'hover:scale-105'
                  }`}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg border border-gray-600 flex-shrink-0"
                style={{ backgroundColor: form.color }}
              />
              <input
                type="color"
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                className="w-full h-9 bg-gray-700/50 border border-gray-600 rounded-lg cursor-pointer"
              />
            </div>
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
