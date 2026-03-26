'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Target, Plus, Pencil, Trash2, X, CheckCircle, PiggyBank, Calendar, ChevronUp } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { S } from './page.styles'

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
    <div className={S.root}>
      {/* Header */}
      <div className={S.pageHeader}>
        <div>
          <h1 className={S.pageTitle}>Metas financieras</h1>
          <p className={S.pageSub}>Ahorrá con un objetivo claro</p>
        </div>
        <button
          onClick={openCreate}
          className={S.newBtn}
        >
          <Plus className="w-4 h-4" />
          Nueva meta
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className={S.summaryGrid}>
          <div className={S.summaryCard}>
            <p className={S.summaryLabel}>Total metas</p>
            <p className={S.summaryValueWhite}>{goals.length}</p>
          </div>
          <div className={S.summaryCard}>
            <p className={S.summaryLabel}>Ahorrado</p>
            <p className={S.summaryValueGreen}>{formatARS(totalSaved)}</p>
          </div>
          <div className={S.summaryCard}>
            <p className={S.summaryLabel}>Falta ahorrar</p>
            <p className={S.summaryValueAmber}>{formatARS(Math.max(0, totalTarget - totalSaved))}</p>
          </div>
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <div className={S.skeletonList}>
          {[1, 2].map(i => <div key={i} className={S.skeletonCard} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className={S.emptyWrap}>
          <PiggyBank className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Todavía no tenés metas</p>
          <p className="text-sm mt-1 mb-5">Creá una meta para empezar a ahorrar</p>
          <button onClick={openCreate} className={S.emptyCreateBtn}>
            Crear primera meta
          </button>
        </div>
      ) : (
        <div className={S.goalsGrid}>
          {goals.map(goal => {
            const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)
            const completed = pct >= 100
            const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount))
            const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null

            return (
              <div
                key={goal.id}
                className={completed ? S.goalCardCompleted : S.goalCardNormal}
              >
                {/* Top row */}
                <div className={S.goalTopRow}>
                  <div className={S.goalIconRow}>
                    <div className={S.goalIconWrap} style={{ backgroundColor: `${goal.color}20` }}>
                      {completed
                        ? <CheckCircle className="w-5 h-5" style={{ color: goal.color }} />
                        : <Target className="w-5 h-5" style={{ color: goal.color }} />}
                    </div>
                    <div>
                      <p className={S.goalName}>{goal.name}</p>
                      {goal.description && <p className={S.goalDesc}>{goal.description}</p>}
                    </div>
                  </div>
                  <div className={S.goalCardActions}>
                    <button onClick={() => openEdit(goal)} className={S.goalEditBtn}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deleteConfirm === goal.id ? (
                      <div className={S.deleteConfirmWrap}>
                        <button onClick={() => handleDelete(goal.id)} className={S.deleteConfirmBtn}>Confirmar</button>
                        <button onClick={() => setDeleteConfirm(null)} className={S.deleteConfirmNoBtn}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(goal.id)} className={S.goalDeleteBtn}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Currency badge */}
                {(goal.currency ?? 'ARS') === 'USD' && (
                  <span className={S.currencyBadge}>
                    USD 🇺🇸
                  </span>
                )}

                {/* Progress bar */}
                <div className={S.progressSection}>
                  <div className={S.progressRow}>
                    <span className={S.progressCurrent}>{formatGoal(Number(goal.current_amount), goal.currency ?? 'ARS')}</span>
                    <span className={S.progressTarget}>{formatGoal(Number(goal.target_amount), goal.currency ?? 'ARS')}</span>
                  </div>
                  <div className={S.progressBar}>
                    <div
                      className={S.progressFill}
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className={S.progressMeta}>
                    <span className="text-xs font-semibold" style={{ color: goal.color }}>{pct.toFixed(1)}%</span>
                    {!completed && <span className={S.progressRemaining}>Falta {formatGoal(remaining, goal.currency ?? 'ARS')}</span>}
                    {completed && <span className={S.progressCompleted}>¡Meta alcanzada!</span>}
                  </div>
                  {/* ARS equivalent for USD goals */}
                  {(goal.currency ?? 'ARS') === 'USD' && blueRate && (
                    <p className={S.arsEquivalent}>
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
                  <div className={S.addInputWrap}>
                    <input
                      type="number"
                      placeholder="Monto (negativo para restar)"
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddAmount(goal)}
                      autoFocus
                      className={S.addInput}
                    />
                    <button onClick={() => handleAddAmount(goal)} className={S.addOkBtn}>
                      OK
                    </button>
                    <button onClick={() => { setAddingTo(null); setAddAmount('') }} className={S.addCancelBtn}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setAddingTo(goal.id); setAddAmount('') }}
                      className={S.addSavingBtn}
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
        <div className={S.modalOverlay}>
          <div className={S.modalBox}>
            <div className={S.modalHeader}>
              <h3 className={S.modalTitle}>{editGoal ? 'Editar meta' : 'Nueva meta'}</h3>
              <button onClick={() => setShowForm(false)} className={S.modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={S.modalFields}>
              {/* Currency toggle */}
              <div>
                <label className={S.fieldLabel}>Moneda</label>
                <div className={S.currencyToggleWrap}>
                  {(['ARS', 'USD'] as const).map(cur => (
                    <button
                      key={cur}
                      onClick={() => setForm(f => ({ ...f, currency: cur }))}
                      className={
                        form.currency === cur
                          ? cur === 'USD'
                            ? S.currencyBtnUsdActive
                            : S.currencyBtnArsActive
                          : S.currencyBtnInactive
                      }
                    >
                      {cur === 'ARS' ? '🇦🇷 Pesos' : '🇺🇸 Dólares'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={S.fieldLabel}>Nombre de la meta</label>
                <input
                  type="text"
                  placeholder="Ej: Vacaciones, Auto, Fondo de emergencia"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={S.textInput}
                />
              </div>

              <div>
                <label className={S.fieldLabel}>Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Viaje a Brasil en diciembre"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={S.textInput}
                />
              </div>

              <div className={S.amountGrid}>
                <div>
                  <label className={S.fieldLabel}>Meta ({form.currency})</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.target_amount}
                    onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                    className={S.textInput}
                  />
                </div>
                <div>
                  <label className={S.fieldLabel}>Ya ahorrado</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.current_amount}
                    onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                    className={S.textInput}
                  />
                </div>
              </div>

              <div>
                <label className={S.fieldLabel}>Fecha límite (opcional)</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className={S.textInput}
                />
              </div>

              <div>
                <label className={S.fieldLabel}>Color</label>
                <div className={S.colorRow}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={S.colorSwatch}
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

            <div className={S.modalActions}>
              <button onClick={() => setShowForm(false)} className={S.cancelBtn}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.target_amount}
                className={S.saveBtn}
              >
                {saving ? 'Guardando...' : editGoal ? 'Actualizar' : 'Crear meta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={S.toast}>
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  )
}
