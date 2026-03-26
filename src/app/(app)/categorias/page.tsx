'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category } from '@/lib/types'
import CategoryForm from '@/components/CategoryForm'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { S } from './page.styles'

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
    <div className={S.root}>
      {/* Header */}
      <div className={S.pageHeader}>
        <div>
          <h1 className={S.pageTitle}>Categorías</h1>
          <p className={S.pageSub}>
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} creada{categories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditCat(null); setShowForm(true) }}
          className={S.newBtn}
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Filter tabs */}
      <div className={S.filterRow}>
        {(['all', 'ingreso', 'gasto'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`${S.filterBtnBase} ${
              filterType === type
                ? type === 'ingreso'
                  ? S.filterBtnIngresoActive
                  : type === 'gasto'
                  ? S.filterBtnGastoActive
                  : S.filterBtnAllActive
                : S.filterBtnInactive
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'ingreso' ? 'Ingresos' : 'Gastos'}
            <span className={S.filterBtnCount}>
              {type === 'all'
                ? categories.length
                : categories.filter((c) => c.type === type).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className={S.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={S.skeletonCard}>
              <div className={S.skeletonLine1} />
              <div className={S.skeletonLine2} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Ingresos section */}
          {(filterType === 'all' || filterType === 'ingreso') && ingresos.length > 0 && (
            <div>
              {filterType === 'all' && (
                <h2 className={S.sectionTitleIngreso}>
                  Ingresos
                </h2>
              )}
              <div className={S.catGrid}>
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
                <h2 className={S.sectionTitleGasto}>
                  Gastos
                </h2>
              )}
              <div className={S.catGrid}>
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
            <div className={S.emptyWrap}>
              <div className={S.emptyIconWrap}>
                <Tag className="w-7 h-7 text-gray-600" />
              </div>
              <p className={S.emptyTitle}>No hay categorías</p>
              <p className={S.emptySub}>
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
    <div className={S.card}>
      <div className={S.cardTop}>
        <div className={S.cardIconRow}>
          <div
            className={S.cardIconWrap}
            style={{
              backgroundColor: `${category.color}20`,
              border: `1px solid ${category.color}40`,
            }}
          >
            <div
              className={S.cardIconDot}
              style={{ backgroundColor: category.color }}
            />
          </div>
          <div>
            <p className={S.cardName}>{category.name}</p>
            <span className={category.type === 'ingreso' ? S.cardTypeIngreso : S.cardTypeGasto}>
              {category.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
            </span>
          </div>
        </div>

        <div className={S.cardActions}>
          <button
            onClick={() => onEdit(category)}
            className={S.editBtn}
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {deleteConfirm === category.id ? (
            <div className={S.deleteConfirmWrap}>
              <button
                onClick={() => onConfirmDelete(category.id)}
                className={S.deleteConfirmYes}
              >
                Sí
              </button>
              <button
                onClick={onCancelDelete}
                className={S.deleteConfirmNo}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => onDelete(category.id)}
              className={S.deleteBtn}
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Color swatch */}
      <div className={S.colorBarWrap}>
        <div
          className={S.colorBar}
          style={{ backgroundColor: category.color }}
        />
        <span className={S.colorHex}>{category.color}</span>
      </div>
    </div>
  )
}
