'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LangContext'

export interface Goal {
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

export interface DolarRate {
  compra: number
  venta: number
}

export interface MetaFormState {
  name: string
  description: string
  target_amount: string
  current_amount: string
  deadline: string
  color: string
  currency: 'ARS' | 'USD'
}

export const emptyMetaForm: MetaFormState = {
  name: '',
  description: '',
  target_amount: '',
  current_amount: '0',
  deadline: '',
  color: '#10b981',
  currency: 'ARS',
}

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function useMetas() {
  const supabase = createClient()
  const { t } = useLang()

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState<MetaFormState>(emptyMetaForm)
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
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
    setGoals((data as Goal[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditGoal(null)
    setForm(emptyMetaForm)
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

  function closeForm() {
    setShowForm(false)
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
    showToast(t.goals.toastAdded(amount > 0 ? '+' : '', formatARS(amount), goal.name))
    load()
  }

  // ARS conversion helper using blue sell rate
  const toARS = (amount: number, currency: 'ARS' | 'USD') =>
    currency === 'USD' && blueRate ? amount * blueRate.venta : currency === 'ARS' ? amount : 0

  const totalTarget = goals.reduce((s, g) => s + toARS(Number(g.target_amount), g.currency ?? 'ARS'), 0)
  const totalSaved = goals.reduce((s, g) => s + toARS(Number(g.current_amount), g.currency ?? 'ARS'), 0)

  return {
    goals,
    loading,
    showForm,
    editGoal,
    form, setForm,
    saving,
    deleteConfirm, setDeleteConfirm,
    addingTo, setAddingTo,
    addAmount, setAddAmount,
    toast,
    blueRate,
    totalTarget,
    totalSaved,
    load,
    openCreate,
    openEdit,
    closeForm,
    handleSave,
    handleDelete,
    handleAddAmount,
    toARS,
  }
}
