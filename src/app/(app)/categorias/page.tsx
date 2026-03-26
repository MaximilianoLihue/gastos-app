'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category } from '@/lib/types'
import CategoryForm from '@/components/CategoryForm'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { ClassNames } from './page.styles'

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
    <div className={ClassNames.root}>
      {/* Header */}
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>Categorías</h1>
          <p className={ClassNames.pageSub}>
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} creada{categories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditCat(null); setShowForm(true) }}
          className={ClassNames.newBtn}
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Filter tabs */}
      <div className={ClassNames.filterRow}>
        {(['all', 'ingreso', 'gasto'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`${ClassNames.filterBtnBase} ${
              filterType === type
                ? type === 'ingreso'
                  ? ClassNames.filterBtnIngresoActive
                  : type === 'gasto'
                  ? ClassNames.filterBtnGastoActive
                  : ClassNames.filterBtnAllActive
                : ClassNames.filterBtnInactive
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'ingreso' ? 'Ingresos' : 'Gastos'}
            <span className={ClassNames.filterBtnCount}>
              {type === 'all'
                ? categories.length
                : categories.filter((c) => c.type === type).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className={ClassNames.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={ClassNames.skeletonCard}>
              <div className={ClassNames.skeletonLine1} />
              <div className={ClassNames.skeletonLine2} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Ingresos section */}
          {(filterType === 'all' || filterType === 'ingreso') && ingresos.length > 0 && (
            <div>
              {filterType === 'all' && (
                <h2 className={ClassNames.sectionTitleIngreso}>
                  Ingresos
                </h2>
              )}
              <div className={ClassNames.catGrid}>
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
                <h2 className={ClassNames.sectionTitleGasto}>
                  Gastos
                </h2>
              )}
              <div className={ClassNames.catGrid}>
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
            <div className={ClassNames.emptyWrap}>
              <div className={ClassNames.emptyIconWrap}>
                <Tag className="w-7 h-7 text-gray-600" />
              </div>
              <p className={ClassNames.emptyTitle}>No hay categorías</p>
              <p className={ClassNames.emptySub}>
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
    <div className={ClassNames.card}>
      <div className={ClassNames.cardTop}>
        <div className={ClassNames.cardIconRow}>
          <div
            className={ClassNames.cardIconWrap}
            style={{
              backgroundColor: `${category.color}20`,
              border: `1px solid ${category.color}40`,
            }}
          >
            <div
              className={ClassNames.cardIconDot}
              style={{ backgroundColor: category.color }}
            />
          </div>
          <div>
            <p className={ClassNames.cardName}>{category.name}</p>
            <span className={category.type === 'ingreso' ? ClassNames.cardTypeIngreso : ClassNames.cardTypeGasto}>
              {category.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
            </span>
          </div>
        </div>

        <div className={ClassNames.cardActions}>
          <button
            onClick={() => onEdit(category)}
            className={ClassNames.editBtn}
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {deleteConfirm === category.id ? (
            <div className={ClassNames.deleteConfirmWrap}>
              <button
                onClick={() => onConfirmDelete(category.id)}
                className={ClassNames.deleteConfirmYes}
              >
                Sí
              </button>
              <button
                onClick={onCancelDelete}
                className={ClassNames.deleteConfirmNo}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => onDelete(category.id)}
              className={ClassNames.deleteBtn}
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Color swatch */}
      <div className={ClassNames.colorBarWrap}>
        <div
          className={ClassNames.colorBar}
          style={{ backgroundColor: category.color }}
        />
        <span className={ClassNames.colorHex}>{category.color}</span>
      </div>
    </div>
  )
}
