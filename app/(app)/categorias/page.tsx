'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category } from '@/lib/types'
import CategoryForm from '@/components/CategoryForm'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'

export default function CategoriasPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'ingreso' | 'gasto'>('all')

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

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  function handleEdit(cat: Category) {
    setEditCat(cat)
    setShowForm(true)
  }

  const filteredCategories =
    filterType === 'all'
      ? categories
      : categories.filter((c) => c.type === filterType)

  const ingresos = filteredCategories.filter((c) => c.type === 'ingreso')
  const gastos = filteredCategories.filter((c) => c.type === 'gasto')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Categorías</h1>
          <p className="text-gray-400 text-sm mt-1">
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} creada{categories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditCat(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20 self-start"
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'ingreso', 'gasto'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterType === type
                ? type === 'ingreso'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : type === 'gasto'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-gray-700 text-white border border-gray-600'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'ingreso' ? 'Ingresos' : 'Gastos'}
            <span className="ml-2 text-xs opacity-60">
              {type === 'all'
                ? categories.length
                : categories.filter((c) => c.type === type).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 animate-pulse"
            >
              <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Ingresos section */}
          {(filterType === 'all' || filterType === 'ingreso') && ingresos.length > 0 && (
            <div>
              {filterType === 'all' && (
                <h2 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3">
                  Ingresos
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ingresos.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={handleEdit}
                    onDelete={setDeleteConfirm}
                    deleteConfirm={deleteConfirm}
                    onConfirmDelete={handleDelete}
                    onCancelDelete={() => setDeleteConfirm(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Gastos section */}
          {(filterType === 'all' || filterType === 'gasto') && gastos.length > 0 && (
            <div>
              {filterType === 'all' && (
                <h2 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-3 mt-2">
                  Gastos
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gastos.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={handleEdit}
                    onDelete={setDeleteConfirm}
                    deleteConfirm={deleteConfirm}
                    onConfirmDelete={handleDelete}
                    onCancelDelete={() => setDeleteConfirm(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                <Tag className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No hay categorías</p>
              <p className="text-gray-600 text-sm mt-1">
                Creá tu primera categoría para empezar
              </p>
            </div>
          )}
        </>
      )}

      {showForm && (
        <CategoryForm
          category={editCat}
          onSuccess={() => { setShowForm(false); setEditCat(null); load() }}
          onCancel={() => { setShowForm(false); setEditCat(null) }}
        />
      )}
    </div>
  )
}

interface CategoryCardProps {
  category: Category
  onEdit: (cat: Category) => void
  onDelete: (id: string) => void
  deleteConfirm: string | null
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
}

function CategoryCard({
  category,
  onEdit,
  onDelete,
  deleteConfirm,
  onConfirmDelete,
  onCancelDelete,
}: CategoryCardProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 hover:border-gray-600 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{
              backgroundColor: `${category.color}20`,
              border: `1px solid ${category.color}40`,
            }}
          >
            <div
              className="w-4 h-4 rounded-md"
              style={{ backgroundColor: category.color }}
            />
          </div>
          <div>
            <p className="text-white font-medium">{category.name}</p>
            <span
              className={`text-xs mt-0.5 inline-block ${
                category.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {category.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {deleteConfirm === category.id ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onConfirmDelete(category.id)}
                className="px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Sí
              </button>
              <button
                onClick={onCancelDelete}
                className="px-2 py-1 rounded-md text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => onDelete(category.id)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Color swatch */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className="h-1.5 flex-1 rounded-full opacity-60"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-gray-600 text-xs font-mono">{category.color}</span>
      </div>
    </div>
  )
}
