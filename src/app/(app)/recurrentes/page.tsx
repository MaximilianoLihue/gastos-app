'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RecurringTransaction, Category } from '@/lib/types'
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle, X, ToggleLeft, ToggleRight, Calendar } from 'lucide-react'
import { format, parseISO, isBefore, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ClassNames } from './page.styles'

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

interface FormState {
  description: string
  amount: string
  type: 'ingreso' | 'gasto'
  category_id: string
  day_of_month: number
  end_date: string
}

const emptyForm: FormState = {
  description: '',
  amount: '',
  type: 'ingreso',
  category_id: '',
  day_of_month: 1,
  end_date: '',
}

export default function RecurrentesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: rec }, { data: cats }] = await Promise.all([
      supabase.from('recurring_transactions').select('*, category:categories(id,name,color,type)').order('type').order('day_of_month'),
      supabase.from('categories').select('*').order('name'),
    ])
    setItems((rec as RecurringTransaction[]) ?? [])
    setCategories((cats as Category[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditItem(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: RecurringTransaction) {
    setEditItem(item)
    setForm({
      description: item.description,
      amount: String(item.amount),
      type: item.type,
      category_id: item.category_id ?? '',
      day_of_month: item.day_of_month,
      end_date: item.end_date ? item.end_date.slice(0, 7) : '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    // end_date is stored as last day of the selected month
    const end_date = form.end_date
      ? format(new Date(form.end_date + '-28'), 'yyyy-MM-') + new Date(parseInt(form.end_date.split('-')[0]), parseInt(form.end_date.split('-')[1]), 0).getDate()
      : null
    const payload = {
      user_id: user.id,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.category_id || null,
      day_of_month: form.day_of_month,
      end_date,
    }
    if (editItem) {
      await supabase.from('recurring_transactions').update(payload).eq('id', editItem.id)
      showToast('Actualizado correctamente')
    } else {
      await supabase.from('recurring_transactions').insert(payload)
      showToast('Creado correctamente')
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('recurring_transactions').delete().eq('id', id)
    setDeleteConfirm(null)
    showToast('Eliminado', true)
    load()
  }

  async function handleToggle(item: RecurringTransaction) {
    await supabase.from('recurring_transactions').update({ active: !item.active }).eq('id', item.id)
    load()
  }

  async function handleRunNow(item: RecurringTransaction) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transactions').insert({
      user_id: user.id,
      description: item.description,
      amount: item.amount,
      type: item.type,
      category_id: item.category_id,
      date: today,
    })
    showToast(`"${item.description}" registrado hoy`)
  }

  const ingresos = items.filter(i => i.type === 'ingreso')
  const gastos = items.filter(i => i.type === 'gasto')
  const filteredCategories = categories.filter(c => c.type === form.type)

  return (
    <div className={ClassNames.root}>
      {/* Header */}
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>Recurrentes</h1>
          <p className={ClassNames.pageSub}>Ingresos y gastos que se repiten cada mes</p>
        </div>
        <button
          onClick={openCreate}
          className={ClassNames.newBtn}
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Info banner */}
      <div className={ClassNames.infoBanner}>
        <p>Los recurrentes activos se registran automáticamente el día configurado de cada mes cuando ingresás a la app.</p>
      </div>

      {loading ? (
        <div className={ClassNames.skeletonList}>
          {[1, 2, 3].map(i => <div key={i} className={ClassNames.skeletonCard} />)}
        </div>
      ) : items.length === 0 ? (
        <div className={ClassNames.emptyWrap}>
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay transacciones recurrentes todavía</p>
          <button onClick={openCreate} className={ClassNames.emptyCreateLink}>
            Crear la primera
          </button>
        </div>
      ) : (
        <div className={ClassNames.listOuter}>
          {[{ label: 'Ingresos', list: ingresos }, { label: 'Gastos', list: gastos }].map(({ label, list }) =>
            list.length > 0 ? (
              <div key={label}>
                <h2 className={ClassNames.sectionTitle}>{label}</h2>
                <div className={ClassNames.sectionList}>
                  {list.map(item => (
                    <div
                      key={item.id}
                      className={item.active ? ClassNames.itemActive : ClassNames.itemInactive}
                    >
                      {/* Color dot */}
                      <div
                        className={ClassNames.itemDot}
                        style={{ backgroundColor: item.category?.color ?? (item.type === 'ingreso' ? '#10b981' : '#ef4444') }}
                      />

                      {/* Info */}
                      <div className={ClassNames.itemInfo}>
                        <p className={ClassNames.itemName}>{item.description}</p>
                        <p className={ClassNames.itemMeta}>
                          {item.category?.name ?? 'Sin categoría'} · Día {item.day_of_month} de cada mes
                          {item.end_date && (
                            <span className={isBefore(parseISO(item.end_date), new Date()) ? ClassNames.itemEndDateExpired : ClassNames.itemEndDateFuture}>
                              · hasta {format(parseISO(item.end_date), 'MMM yyyy', { locale: es })}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Amount */}
                      <span className={item.type === 'ingreso' ? ClassNames.itemAmountIngreso : ClassNames.itemAmountGasto}>
                        {item.type === 'ingreso' ? '+' : '-'}{formatARS(Number(item.amount))}
                      </span>

                      {/* Actions */}
                      <div className={ClassNames.itemActions}>
                        <button
                          onClick={() => handleRunNow(item)}
                          className={ClassNames.runNowBtn}
                          title="Registrar hoy"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(item)}
                          className={ClassNames.toggleBtn}
                          title={item.active ? 'Desactivar' : 'Activar'}
                        >
                          {item.active
                            ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                            : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className={ClassNames.editBtn}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === item.id ? (
                          <div className={ClassNames.deleteConfirmWrap}>
                            <button onClick={() => handleDelete(item.id)} className={ClassNames.deleteConfirmYes}>
                              Confirmar
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className={ClassNames.deleteConfirmNo}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className={ClassNames.deleteBtn}
                            title="Eliminar"
                          >
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

      {/* Form modal */}
      {showForm && (
        <div className={ClassNames.modalOverlay}>
          <div className={ClassNames.modalBox}>
            <div className={ClassNames.modalHeader}>
              <h3 className={ClassNames.modalTitle}>
                {editItem ? 'Editar recurrente' : 'Nuevo recurrente'}
              </h3>
              <button onClick={() => setShowForm(false)} className={ClassNames.modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={ClassNames.modalFields}>
              {/* Type toggle */}
              <div className={ClassNames.typeToggleWrap}>
                {(['ingreso', 'gasto'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t, category_id: '' }))}
                    className={
                      form.type === t
                        ? t === 'ingreso' ? ClassNames.typeToggleIngresoActive : ClassNames.typeToggleGastoActive
                        : ClassNames.typeToggleInactive
                    }
                  >
                    {t === 'ingreso' ? 'Ingreso' : 'Gasto'}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className={ClassNames.fieldLabel}>Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Sueldo, Alquiler..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={ClassNames.input}
                />
              </div>

              {/* Amount */}
              <div>
                <label className={ClassNames.fieldLabel}>Monto (ARS)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={ClassNames.input}
                />
              </div>

              {/* Day of month */}
              <div>
                <label className={ClassNames.fieldLabel}>Día del mes</label>
                <select
                  value={form.day_of_month}
                  onChange={e => setForm(f => ({ ...f, day_of_month: Number(e.target.value) }))}
                  className={ClassNames.select}
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>Día {d}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className={ClassNames.fieldLabel}>Categoría (opcional)</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className={ClassNames.select}
                >
                  <option value="">Sin categoría</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* End date */}
              <div>
                <label className={ClassNames.endDateLabel}>
                  <Calendar className="w-3.5 h-3.5" />
                  Hasta mes (opcional)
                </label>
                <input
                  type="month"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className={ClassNames.input}
                />
                {form.end_date && (
                  <button
                    onClick={() => setForm(f => ({ ...f, end_date: '' }))}
                    className={ClassNames.clearEndDateBtn}
                  >
                    Quitar fecha de fin
                  </button>
                )}
              </div>
            </div>

            <div className={ClassNames.modalActions}>
              <button
                onClick={() => setShowForm(false)}
                className={ClassNames.cancelBtn}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description.trim() || !form.amount}
                className={ClassNames.saveBtn}
              >
                {saving ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={toast.ok ? ClassNames.toastOk : ClassNames.toastErr}>
          <CheckCircle className="w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
