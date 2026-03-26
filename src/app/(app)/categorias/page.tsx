'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category } from '@/lib/types'
import CategoryForm from '@/components/CategoryForm'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { ClassNames } from './page.styles'
import { useT } from '@/lib/i18n/LangContext'

export default function CategoriasPage() {
  const t = useT()
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
          <h1 className={ClassNames.pageTitle}>{t.categories.title}</h1>
          <p className={ClassNames.pageSub}>{t.categories.count(categories.length)}</p>
        </div>
        <button
          onClick={() => { setEditCat(null); setShowForm(true) }}
          className={ClassNames.newBtn}
        >
          <Plus className="w-4 h-4" />
          {t.categories.newBtn}
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
            {type === 'all' ? t.common.allF : type === 'ingreso' ? t.common.incomes : t.common.expenses}
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
                <h2 className={ClassNames.sectionTitleIngreso}>{t.common.incomes}</h2>
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
                <h2 className={ClassNames.sectionTitleGasto}>{t.common.expenses}</h2>
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
              <p className={ClassNames.emptyTitle}>{t.categories.noCategories}</p>
              <p className={ClassNames.emptySub}>{t.categories.noSub}</p>
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
  const t = useT()
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
              {category.type === 'ingreso' ? t.common.income : t.common.expense}
            </span>
          </div>
        </div>

        <div className={ClassNames.cardActions}>
          <button
            onClick={() => onEdit(category)}
            className={ClassNames.editBtn}
            title={t.common.edit}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {deleteConfirm === category.id ? (
            <div className={ClassNames.deleteConfirmWrap}>
              <button onClick={() => onConfirmDelete(category.id)} className={ClassNames.deleteConfirmYes}>
                {t.common.yes}
              </button>
              <button onClick={onCancelDelete} className={ClassNames.deleteConfirmNo}>
                {t.common.no}
              </button>
            </div>
          ) : (
            <button
              onClick={() => onDelete(category.id)}
              className={ClassNames.deleteBtn}
              title={t.common.delete}
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
