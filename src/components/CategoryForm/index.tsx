'use client'

import { Category, TransactionType } from '@/lib/types'
import { X, Save, Loader2 } from 'lucide-react'
import { S } from './categoryForm.styles'
import { useCategoryForm } from './logic/useCategoryForm'

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
  const { loading, error, form, setForm, handleSubmit } =
    useCategoryForm({ category, onSuccess })

  return (
    <div className={S.overlay}>
      <div className={S.modal}>
        {/* Header */}
        <div className={S.header}>
          <h3 className={S.headerTitle}>
            {category ? 'Editar categoría' : 'Nueva categoría'}
          </h3>
          <button
            onClick={onCancel}
            className={S.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={S.form}>
          {/* Name */}
          <div>
            <label className={S.label}>
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
              className={S.input}
            />
          </div>

          {/* Type */}
          <div>
            <label className={S.label}>
              Tipo
            </label>
            <div className={S.typeGrid}>
              {(['ingreso', 'gasto'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: t }))}
                  className={`${S.typeBtnBase} ${
                    form.type === t
                      ? t === 'ingreso'
                        ? S.typeBtnIngreso
                        : S.typeBtnGasto
                      : S.typeBtnInactive
                  }`}
                >
                  {t === 'ingreso' ? 'Ingreso' : 'Gasto'}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className={S.label}>
              Color
            </label>
            <div className={S.colorSwatchWrap}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  style={{ backgroundColor: color }}
                  className={`${S.colorSwatchBase} ${
                    form.color === color
                      ? S.colorSwatchActive
                      : S.colorSwatchInactive
                  }`}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <div className={S.colorPickerRow}>
              <div
                className={S.colorPreview}
                style={{ backgroundColor: form.color }}
              />
              <input
                type="color"
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                className={S.colorInput}
              />
            </div>
          </div>

          {error && (
            <p className={S.error}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className={S.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={S.cancelBtn}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={S.submitBtn}
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
