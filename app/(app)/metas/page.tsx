'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Target, Plus, Pencil, Trash2, X, CheckCircle, PiggyBank, Calendar, ChevronUp } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Goal {
  id: string
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  deadline: string | null
  color: string
  currency: 'ARS' | 'USD'
  created_at: string
}

interface DolarRate {
  compra: number
  venta: number
}

const COLORS = [
  '#10b981', '#3b82f6', '#f97316', '#a855f7',
  '#ec4899', '#eab308', '#14b8a6', '#f43f5e',
  '#84cc16', '#06b6d4',
]

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatUSD(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatGoal(value: number, currency: 'ARS' | 'USD') {
  return currency === 'USD' ? formatUSD(value) : formatARS(value)
}

interface FormState {
  name: string
  description: string
  target_amount: string
  current_amount: string
  deadline: string
  color: string
  currency: 'ARS' | 'USD'
}

const emptyForm: FormState = {
  name: '', description: '', target_amount: '', current_amount: '0', deadline: '', color: '#10b981', currency: 'ARS',
}

export default function MetasPage() {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addAmount, setAddAmount] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [blueRate, setBlueRate] = useState<DolarRate | null>(null)

  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(r => r.json())
      .then(d => setBlueRate({ compra: d.compra, venta: d.venta }))
      .catch(() => {})
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    setGoals((data as Goal[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditGoal(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(g: Goal) {
    setEditGoal(g)
    setForm({
      name: g.name,
      description: g.description ?? '',
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      deadline: g.deadline ?? '',
      color: g.color,
      currency: g.currency ?? 'ARS',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.target_amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || null,
      color: form.color,
      currency: form.currency,
    }
    if (editGoal) {
      await supabase.from('goals').update(payload).eq('id', editGoal.id)
    } else {
      await supabase.from('goals').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  async function handleAddAmount(goal: Goal) {
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount === 0) return
    const newAmount = Math.max(0, Number(goal.current_amount) + amount)
    await supabase.from('goals').update({ current_amount: newAmount }).eq('id', goal.id)
    setAddingTo(null)
    setAddAmount('')
    showToast(`${amount > 0 ? '+' : ''}${formatARS(amount)} agregado a "${goal.name}"`)
    load()
  }

  // Convert everything to ARS for summary using blue rate
  const toARS = (amount: number, currency: 'ARS' | 'USD') =>
    currency === 'USD' && blueRate ? amount * blueRate.venta : currency === 'ARS' ? amount : 0

  const totalTarget = goals.reduce((s, g) => s + toARS(Number(g.target_amount), g.currency ?? 'ARS'), 0)
  const totalSaved = goals.reduce((s, g) => s + toARS(Number(g.current_amount), g.currency ?? 'ARS'), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Metas financieras</h1>
          <p className="text-gray-400 text-sm mt-1">Ahorrá con un objetivo claro</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nueva meta
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
            <p className="text-gray-400 text-sm mb-1">Total metas</p>
            <p className="text-white text-2xl font-bold">{goals.length}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
            <p className="text-gray-400 text-sm mb-1">Ahorrado</p>
            <p className="text-emerald-400 text-2xl font-bold">{formatARS(totalSaved)}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
            <p className="text-gray-400 text-sm mb-1">Falta ahorrar</p>
            <p className="text-amber-400 text-2xl font-bold">{formatARS(Math.max(0, totalTarget - totalSaved))}</p>
          </div>
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-40 bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <PiggyBank className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Todavía no tenés metas</p>
          <p className="text-sm mt-1 mb-5">Creá una meta para empezar a ahorrar</p>
          <button onClick={openCreate} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors">
            Crear primera meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)
            const completed = pct >= 100
            const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount))
            const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null

            return (
              <div
                key={goal.id}
                className={`bg-gray-800/50 border rounded-2xl p-6 transition-all ${completed ? 'border-emerald-500/40' : 'border-gray-700/50'}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${goal.color}20` }}>
                      {completed
                        ? <CheckCircle className="w-5 h-5" style={{ color: goal.color }} />
                        : <Target className="w-5 h-5" style={{ color: goal.color }} />}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{goal.name}</p>
                      {goal.description && <p className="text-gray-500 text-xs mt-0.5">{goal.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deleteConfirm === goal.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(goal.id)} className="px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30">Confirmar</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded-md text-xs bg-gray-700 text-gray-400">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(goal.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Currency badge */}
                {(goal.currency ?? 'ARS') === 'USD' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-xs font-medium mb-3">
                    USD 🇺🇸
                  </span>
                )}

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-white font-semibold">{formatGoal(Number(goal.current_amount), goal.currency ?? 'ARS')}</span>
                    <span className="text-gray-400">{formatGoal(Number(goal.target_amount), goal.currency ?? 'ARS')}</span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs font-semibold" style={{ color: goal.color }}>{pct.toFixed(1)}%</span>
                    {!completed && <span className="text-gray-500 text-xs">Falta {formatGoal(remaining, goal.currency ?? 'ARS')}</span>}
                    {completed && <span className="text-emerald-400 text-xs font-semibold">¡Meta alcanzada!</span>}
                  </div>
                  {/* ARS equivalent for USD goals */}
                  {(goal.currency ?? 'ARS') === 'USD' && blueRate && (
                    <p className="text-gray-600 text-xs mt-1">
                      ≈ {formatARS(Number(goal.current_amount) * blueRate.venta)} / {formatARS(Number(goal.target_amount) * blueRate.venta)} (blue)
                    </p>
                  )}
                </div>

                {/* Deadline */}
                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: daysLeft !== null && daysLeft < 0 ? '#f43f5e' : daysLeft !== null && daysLeft <= 30 ? '#eab308' : '#6b7280' }}>
                    <Calendar className="w-3.5 h-3.5" />
                    {daysLeft !== null && daysLeft < 0
                      ? `Vencida hace ${Math.abs(daysLeft)} días`
                      : daysLeft === 0
                      ? 'Vence hoy'
                      : `Vence ${format(parseISO(goal.deadline), "d 'de' MMMM yyyy", { locale: es })} · ${daysLeft} días`}
                  </div>
                )}

                {/* Add/subtract amount */}
                {addingTo === goal.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      placeholder="Monto (negativo para restar)"
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddAmount(goal)}
                      autoFocus
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <button onClick={() => handleAddAmount(goal)} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium">
                      OK
                    </button>
                    <button onClick={() => { setAddingTo(null); setAddAmount('') }} className="px-3 py-2 rounded-xl bg-gray-700 text-gray-400 text-sm">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setAddingTo(goal.id); setAddAmount('') }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-400 text-sm transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                      Agregar ahorro
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">{editGoal ? 'Editar meta' : 'Nueva meta'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Currency toggle */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Moneda</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-700">
                  {(['ARS', 'USD'] as const).map(cur => (
                    <button
                      key={cur}
                      onClick={() => setForm(f => ({ ...f, currency: cur }))}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        form.currency === cur
                          ? cur === 'USD'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {cur === 'ARS' ? '🇦🇷 Pesos' : '🇺🇸 Dólares'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Nombre de la meta</label>
                <input
                  type="text"
                  placeholder="Ej: Vacaciones, Auto, Fondo de emergencia"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Viaje a Brasil en diciembre"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Meta ({form.currency})</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.target_amount}
                    onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Ya ahorrado</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.current_amount}
                    onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Fecha límite (opcional)</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        outline: form.color === color ? `3px solid ${color}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.target_amount}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editGoal ? 'Actualizar' : 'Crear meta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium z-50 bg-emerald-500 text-white">
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  )
}
