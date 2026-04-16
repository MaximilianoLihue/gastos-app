'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category, TransactionType } from '@/lib/types'

export function useCategorias() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('type')
      .order('name')
    setCategories((data as Category[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  function openEdit(cat: Category) {
    setEditCat(cat)
    setShowForm(true)
  }

  function openCreate() {
    setEditCat(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditCat(null)
  }

  const filteredCategories =
    filterType === 'all'
      ? categories
      : categories.filter((c) => c.type === filterType)

  const ingresos = filteredCategories.filter((c) => c.type === 'ingreso')
  const gastos = filteredCategories.filter((c) => c.type === 'gasto')

  return {
    categories,
    loading,
    showForm,
    editCat,
    deleteConfirm, setDeleteConfirm,
    filterType, setFilterType,
    filteredCategories,
    ingresos,
    gastos,
    load,
    handleDelete,
    openEdit,
    openCreate,
    closeForm,
  }
}
