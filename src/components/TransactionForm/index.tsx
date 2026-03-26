'use client'

import { Transaction, TransactionType } from '@/lib/types'
import { X, Save, Loader2 } from 'lucide-react'
import { ClassNames } from './transactionForm.styles'
import { useTransactionForm } from './logic/useTransactionForm'
import { useT } from '@/lib/i18n/LangContext'

interface TransactionFormProps {
  transaction?: Transaction | null
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const t = useT()
  const { loading, categories, error, form, setForm, handleTypeChange, handleSubmit } =
    useTransactionForm({ transaction, onSuccess })

  return (
    <div className={ClassNames.overlay}>
      <div className={ClassNames.modal}>
        <div className={ClassNames.header}>
          <h3 className={ClassNames.headerTitle}>
            {transaction ? t.transactionForm.titleEdit : t.transactionForm.titleNew}
          </h3>
          <button onClick={onCancel} className={ClassNames.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={ClassNames.form}>
          <div>
            <label className={ClassNames.label}>{t.common.type}</label>
            <div className={ClassNames.typeGrid}>
              {(['ingreso', 'gasto'] as TransactionType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => handleTypeChange(tp)}
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
            <label className={ClassNames.label}>{t.common.amount}</label>
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
                <span className={ClassNames.amountPrefix}>{form.currency === 'USD' ? 'U$S' : '$'}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className={ClassNames.amountInput}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={ClassNames.label}>{t.common.description}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t.transactionForm.descriptionPlaceholder}
              className={ClassNames.input}
            />
          </div>

          <div>
            <label className={ClassNames.label}>{t.common.date}</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className={ClassNames.dateInput}
            />
          </div>

          <div>
            <label className={ClassNames.label}>{t.common.category}</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
              className={ClassNames.select}
            >
              <option value="">{t.common.noCategory}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
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
