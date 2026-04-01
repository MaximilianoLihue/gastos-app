'use client'

import { Plus, Pencil, Trash2, RefreshCw, CheckCircle, X, ToggleLeft, ToggleRight, Calendar } from 'lucide-react'
import { format, parseISO, isBefore } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { ClassNames } from './page.styles'
import { useLang } from '@/lib/i18n/LangContext'
import { useRecurrentes } from '@/LogicService/secciones/recurrentes/useRecurrentes'

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

export function RecurrentesSection() {
  const { t, lang } = useLang()
  const dateLocale = lang === 'en' ? enUS : es

  const {
    items,
    loading,
    showForm,
    editItem,
    form, setForm,
    saving,
    deleteConfirm, setDeleteConfirm,
    toast,
    ingresos,
    gastos,
    filteredCategories,
    openCreate,
    openEdit,
    closeForm,
    handleSave,
    handleDelete,
    handleToggle,
    handleRunNow,
  } = useRecurrentes()

  return (
    <div className={ClassNames.root}>
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>{t.recurring.title}</h1>
          <p className={ClassNames.pageSub}>{t.recurring.sub}</p>
        </div>
        <button onClick={openCreate} className={ClassNames.newBtn}>
          <Plus className="w-4 h-4" />
          {t.recurring.newBtn}
        </button>
      </div>

      <div className={ClassNames.infoBanner}>
        <p>{t.recurring.infoBanner}</p>
      </div>

      {loading ? (
        <div className={ClassNames.skeletonList}>
          {[1, 2, 3].map(i => <div key={i} className={ClassNames.skeletonCard} />)}
        </div>
      ) : items.length === 0 ? (
        <div className={ClassNames.emptyWrap}>
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t.recurring.noItems}</p>
          <button onClick={openCreate} className={ClassNames.emptyCreateLink}>
            {t.recurring.createFirst}
          </button>
        </div>
      ) : (
        <div className={ClassNames.listOuter}>
          {[{ label: t.common.incomes, list: ingresos }, { label: t.common.expenses, list: gastos }].map(({ label, list }) =>
            list.length > 0 ? (
              <div key={label}>
                <h2 className={ClassNames.sectionTitle}>{label}</h2>
                <div className={ClassNames.sectionList}>
                  {list.map(item => (
                    <div key={item.id} className={item.active ? ClassNames.itemActive : ClassNames.itemInactive}>
                      <div
                        className={ClassNames.itemDot}
                        style={{ backgroundColor: item.category?.color ?? (item.type === 'ingreso' ? '#10b981' : '#ef4444') }}
                      />

                      <div className={ClassNames.itemInfo}>
                        <p className={ClassNames.itemName}>{item.description}</p>
                        <p className={ClassNames.itemMeta}>
                          {item.category?.name ?? t.common.noCategory} · {t.recurring.metaDay(item.day_of_month)}
                          {item.end_date && (
                            <span className={isBefore(parseISO(item.end_date), new Date()) ? ClassNames.itemEndDateExpired : ClassNames.itemEndDateFuture}>
                              · {t.recurring.metaUntil(format(parseISO(item.end_date), 'MMM yyyy', { locale: dateLocale }))}
                            </span>
                          )}
                        </p>
                      </div>

                      <span className={item.type === 'ingreso' ? ClassNames.itemAmountIngreso : ClassNames.itemAmountGasto}>
                        {item.type === 'ingreso' ? '+' : '-'}{formatARS(Number(item.amount))}
                      </span>

                      <div className={ClassNames.itemActions}>
                        <button onClick={() => handleRunNow(item)} className={ClassNames.runNowBtn} title={t.recurring.registerToday}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggle(item)} className={ClassNames.toggleBtn} title={item.active ? t.recurring.deactivate : t.recurring.activate}>
                          {item.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(item)} className={ClassNames.editBtn} title={t.common.edit}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === item.id ? (
                          <div className={ClassNames.deleteConfirmWrap}>
                            <button onClick={() => handleDelete(item.id)} className={ClassNames.deleteConfirmYes}>{t.common.confirm}</button>
                            <button onClick={() => setDeleteConfirm(null)} className={ClassNames.deleteConfirmNo}>{t.common.no}</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(item.id)} className={ClassNames.deleteBtn} title={t.common.delete}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {showForm && (
        <div className={ClassNames.modalOverlay}>
          <div className={ClassNames.modalBox}>
            <div className={ClassNames.modalHeader}>
              <h3 className={ClassNames.modalTitle}>
                {editItem ? t.recurring.formEdit : t.recurring.formNew}
              </h3>
              <button onClick={closeForm} className={ClassNames.modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={ClassNames.modalFields}>
              <div className={ClassNames.typeToggleWrap}>
                {(['ingreso', 'gasto'] as const).map(rType => (
                  <button
                    key={rType}
                    onClick={() => setForm(f => ({ ...f, type: rType, category_id: '' }))}
                    className={
                      form.type === rType
                        ? rType === 'ingreso' ? ClassNames.typeToggleIngresoActive : ClassNames.typeToggleGastoActive
                        : ClassNames.typeToggleInactive
                    }
                  >
                    {rType === 'ingreso' ? t.common.income : t.common.expense}
                  </button>
                ))}
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.recurring.fieldDescription}</label>
                <input
                  type="text"
                  placeholder={t.recurring.fieldDescriptionPlaceholder}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={ClassNames.input}
                />
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.recurring.fieldAmount}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={ClassNames.input}
                />
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.recurring.fieldDay}</label>
                <select
                  value={form.day_of_month}
                  onChange={e => setForm(f => ({ ...f, day_of_month: Number(e.target.value) }))}
                  className={ClassNames.select}
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>{t.recurring.dayOption(d)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.recurring.fieldCategory}</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className={ClassNames.select}
                >
                  <option value="">{t.common.noCategory}</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={ClassNames.endDateLabel}>
                  <Calendar className="w-3.5 h-3.5" />
                  {t.recurring.fieldEndDate}
                </label>
                <input
                  type="month"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className={ClassNames.input}
                />
                {form.end_date && (
                  <button onClick={() => setForm(f => ({ ...f, end_date: '' }))} className={ClassNames.clearEndDateBtn}>
                    {t.recurring.clearEndDate}
                  </button>
                )}
              </div>
            </div>

            <div className={ClassNames.modalActions}>
              <button onClick={closeForm} className={ClassNames.cancelBtn}>{t.common.cancel}</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description.trim() || !form.amount}
                className={ClassNames.saveBtn}
              >
                {saving ? t.common.saving : editItem ? t.common.save : t.common.new}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={toast.ok ? ClassNames.toastOk : ClassNames.toastErr}>
          <CheckCircle className="w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
