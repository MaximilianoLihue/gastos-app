'use client'

import { Transaction, TransactionType } from '@/lib/types'
import { X, Save, Loader2 } from 'lucide-react'
import { S } from './transactionForm.styles'
import { useTransactionForm } from './logic/useTransactionForm'

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
  const { loading, categories, error, form, setForm, handleTypeChange, handleSubmit } =
    useTransactionForm({ transaction, onSuccess })

  return (
    <div className={S.overlay}>
      <div className={S.modal}>
        {/* Header */}
        <div className={S.header}>
          <h3 className={S.headerTitle}>
            {transaction ? 'Editar transacción' : 'Nueva transacción'}
          </h3>
          <button
            onClick={onCancel}
            className={S.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={S.form}>
          {/* Type selector */}
          <div>
            <label className={S.label}>
              Tipo
            </label>
            <div className={S.typeGrid}>
              {(['ingreso', 'gasto'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
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

          {/* Amount */}
          <div>
            <label className={S.label}>
              Monto (ARS)
            </label>
            <div className={S.amountWrap}>
              <span className={S.amountPrefix}>
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
                className={S.amountInput}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={S.label}>
              Descripción
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Descripción opcional..."
              className={S.input}
            />
          </div>

          {/* Date */}
          <div>
            <label className={S.label}>
              Fecha
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className={S.dateInput}
            />
          </div>

          {/* Category */}
          <div>
            <label className={S.label}>
              Categoría
            </label>
            <select
              value={form.category_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category_id: e.target.value }))
              }
              className={S.select}
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
