'use client'

import { Category, TransactionType } from '@/lib/types'
import { X, Save, Loader2 } from 'lucide-react'
import { ClassNames } from './categoryForm.styles'
import { useCategoryForm } from './logic/useCategoryForm'
import { useT } from '@/lib/i18n/LangContext'

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

export default function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const t = useT()
  const { loading, error, form, setForm, handleSubmit } = useCategoryForm({ category, onSuccess })

  return (
    <div className={ClassNames.overlay}>
      <div className={ClassNames.modal}>
        <div className={ClassNames.header}>
          <h3 className={ClassNames.headerTitle}>
            {category ? t.categoryForm.titleEdit : t.categoryForm.titleNew}
          </h3>
          <button onClick={onCancel} className={ClassNames.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={ClassNames.form}>
          <div>
            <label className={ClassNames.label}>{t.common.name}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t.categoryForm.namePlaceholder}
              className={ClassNames.input}
            />
          </div>

          <div>
            <label className={ClassNames.label}>{t.common.type}</label>
            <div className={ClassNames.typeGrid}>
              {(['ingreso', 'gasto'] as TransactionType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: tp }))}
                  className={`${ClassNames.typeBtnBase} ${
                    form.type === tp
                      ? tp === 'ingreso' ? ClassNames.typeBtnIngreso : ClassNames.typeBtnGasto
                      : ClassNames.typeBtnInactive
                  }`}
                >
                  {tp === 'ingreso' ? t.common.income : t.common.expense}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={ClassNames.label}>{t.common.color}</label>
            <div className={ClassNames.colorSwatchWrap}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  style={{ backgroundColor: color }}
                  className={`${ClassNames.colorSwatchBase} ${
                    form.color === color ? ClassNames.colorSwatchActive : ClassNames.colorSwatchInactive
                  }`}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <div className={ClassNames.colorPickerRow}>
              <div className={ClassNames.colorPreview} style={{ backgroundColor: form.color }} />
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                className={ClassNames.colorInput}
              />
            </div>
          </div>

          {error && <p className={ClassNames.error}>{error}</p>}

          <div className={ClassNames.actions}>
            <button type="button" onClick={onCancel} className={ClassNames.cancelBtn}>
              {t.common.cancel}
            </button>
            <button type="submit" disabled={loading} className={ClassNames.submitBtn}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
