'use client'

import { Transaction, TransactionType } from '@/lib/types'
import { X, Save, Loader2 } from 'lucide-react'
import { ClassNames } from './transactionForm.styles'
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
    <div className={ClassNames.overlay}>
      <div className={ClassNames.modal}>
        {/* Header */}
        <div className={ClassNames.header}>
          <h3 className={ClassNames.headerTitle}>
            {transaction ? 'Editar transacción' : 'Nueva transacción'}
          </h3>
          <button
            onClick={onCancel}
            className={ClassNames.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={ClassNames.form}>
          {/* Type selector */}
          <div>
            <label className={ClassNames.label}>
              Tipo
            </label>
            <div className={ClassNames.typeGrid}>
              {(['ingreso', 'gasto'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`${ClassNames.typeBtnBase} ${
                    form.type === t
                      ? t === 'ingreso'
                        ? ClassNames.typeBtnIngreso
                        : ClassNames.typeBtnGasto
                      : ClassNames.typeBtnInactive
                  }`}
                >
                  {t === 'ingreso' ? 'Ingreso' : 'Gasto'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className={ClassNames.label}>Monto</label>
            <div className={ClassNames.amountRow}>
              <div className={ClassNames.currencyToggle}>
                {(['ARS', 'USD'] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, currency: cur }))}
                    className={form.currency === cur
                      ? cur === 'USD' ? ClassNames.currencyBtnUsdActive : ClassNames.currencyBtnArsActive
                      : ClassNames.currencyBtnInactive}
                  >
                    {cur === 'ARS' ? '$ ARS' : 'USD'}
                  </button>
                ))}
              </div>
              <div className={ClassNames.amountWrap}>
                <span className={ClassNames.amountPrefix}>
                  {form.currency === 'USD' ? 'U$S' : '$'}
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
                  className={ClassNames.amountInput}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={ClassNames.label}>
              Descripción
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Descripción opcional..."
              className={ClassNames.input}
            />
          </div>

          {/* Date */}
          <div>
            <label className={ClassNames.label}>
              Fecha
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className={ClassNames.dateInput}
            />
          </div>

          {/* Category */}
          <div>
            <label className={ClassNames.label}>
              Categoría
            </label>
            <select
              value={form.category_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category_id: e.target.value }))
              }
              className={ClassNames.select}
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
            <p className={ClassNames.error}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className={ClassNames.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={ClassNames.cancelBtn}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={ClassNames.submitBtn}
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
