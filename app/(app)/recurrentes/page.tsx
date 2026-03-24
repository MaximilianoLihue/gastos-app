'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RecurringTransaction, Category } from '@/lib/types'
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle, X, ToggleLeft, ToggleRight, Calendar } from 'lucide-react'
import { format, parseISO, isBefore, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Recurrentes</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresos y gastos que se repiten cada mes</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 text-sm">
        <p>Los recurrentes activos se registran automáticamente el día configurado de cada mes cuando ingresás a la app.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay transacciones recurrentes todavía</p>
          <button onClick={openCreate} className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm underline">
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {[{ label: 'Ingresos', list: ingresos }, { label: 'Gastos', list: gastos }].map(({ label, list }) =>
            list.length > 0 ? (
              <div key={label}>
                <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">{label}</h2>
                <div className="space-y-2">
                  {list.map(item => (
                    <div
                      key={item.id}
                      className={`bg-gray-800/50 border rounded-2xl px-5 py-4 flex items-center gap-4 transition-opacity ${
                        item.active ? 'border-gray-700/50' : 'border-gray-700/20 opacity-50'
                      }`}
                    >
                      {/* Color dot */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.category?.color ?? (item.type === 'ingreso' ? '#10b981' : '#ef4444') }}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{item.description}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {item.category?.name ?? 'Sin categoría'} · Día {item.day_of_month} de cada mes
                          {item.end_date && (
                            <span className={`ml-1 ${isBefore(parseISO(item.end_date), new Date()) ? 'text-red-400' : 'text-amber-400'}`}>
                              · hasta {format(parseISO(item.end_date), 'MMM yyyy', { locale: es })}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Amount */}
                      <span className={`font-semibold text-sm flex-shrink-0 ${item.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.type === 'ingreso' ? '+' : '-'}{formatARS(Number(item.amount))}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleRunNow(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Registrar hoy"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title={item.active ? 'Desactivar' : 'Activar'}
                        >
                          {item.active
                            ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                            : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === item.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(item.id)} className="px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                              Confirmar
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded-md text-xs bg-gray-700 text-gray-400">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">
                {editItem ? 'Editar recurrente' : 'Nuevo recurrente'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-700">
                {(['ingreso', 'gasto'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t, category_id: '' }))}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      form.type === t
                        ? t === 'ingreso' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t === 'ingreso' ? 'Ingreso' : 'Gasto'}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Sueldo, Alquiler..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Monto (ARS)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Day of month */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Día del mes</label>
                <select
                  value={form.day_of_month}
                  onChange={e => setForm(f => ({ ...f, day_of_month: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>Día {d}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Categoría (opcional)</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* End date */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Hasta mes (opcional)
                </label>
                <input
                  type="month"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
                {form.end_date && (
                  <button
                    onClick={() => setForm(f => ({ ...f, end_date: '' }))}
                    className="text-xs text-gray-500 hover:text-red-400 mt-1 transition-colors"
                  >
                    Quitar fecha de fin
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description.trim() || !form.amount}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium z-50 ${
          toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <CheckCircle className="w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
