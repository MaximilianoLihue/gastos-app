'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RecurringTransaction, Category } from '@/lib/types'
import { format } from 'date-fns'
import { useLang } from '@/lib/i18n/LangContext'

export interface RecurrenteFormState {
  description: string
  amount: string
  type: 'ingreso' | 'gasto'
  category_id: string
  day_of_month: number
  end_date: string
}

const emptyForm: RecurrenteFormState = {
  description: '',
  amount: '',
  type: 'ingreso',
  category_id: '',
  day_of_month: 1,
  end_date: '',
}

export function useRecurrentes() {
  const supabase = createClient()
  const { t } = useLang()

  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null)
  const [form, setForm] = useState<RecurrenteFormState>(emptyForm)
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
      supabase
        .from('recurring_transactions')
        .select('*, category:categories(id,name,color,type)')
        .order('type')
        .order('day_of_month'),
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

  function closeForm() {
    setShowForm(false)
  }

  async function handleSave() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // end_date is stored as the last day of the selected month
    const end_date = form.end_date
      ? format(new Date(form.end_date + '-28'), 'yyyy-MM-') +
        new Date(
          parseInt(form.end_date.split('-')[0]),
          parseInt(form.end_date.split('-')[1]),
          0
        ).getDate()
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
      showToast(t.recurring.toastUpdated)
    } else {
      await supabase.from('recurring_transactions').insert(payload)
      showToast(t.recurring.toastCreated)
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('recurring_transactions').delete().eq('id', id)
    setDeleteConfirm(null)
    showToast(t.recurring.toastDeleted)
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
    showToast(t.recurring.toastRegisteredToday(item.description))
  }

  const ingresos = items.filter(i => i.type === 'ingreso')
  const gastos = items.filter(i => i.type === 'gasto')
  const filteredCategories = categories.filter(c => c.type === form.type)

  return {
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
    load,
    openCreate,
    openEdit,
    closeForm,
    handleSave,
    handleDelete,
    handleToggle,
    handleRunNow,
  }
}
