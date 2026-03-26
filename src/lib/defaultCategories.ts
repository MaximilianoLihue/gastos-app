export const DEFAULT_CATEGORIES = [
  // Gastos
  { name: 'Transferencias',  color: '#6366f1', type: 'gasto' as const },
  { name: 'Comida',          color: '#f97316', type: 'gasto' as const },
  { name: 'Transporte',      color: '#3b82f6', type: 'gasto' as const },
  { name: 'Salud',           color: '#ec4899', type: 'gasto' as const },
  { name: 'Entretenimiento', color: '#a855f7', type: 'gasto' as const },
  { name: 'Servicios',       color: '#eab308', type: 'gasto' as const },
  { name: 'Vivienda',        color: '#14b8a6', type: 'gasto' as const },
  { name: 'Ropa',            color: '#f43f5e', type: 'gasto' as const },
  { name: 'Inversiones',     color: '#84cc16', type: 'gasto' as const },
  { name: 'Educación',       color: '#06b6d4', type: 'gasto' as const },
  { name: 'Otros gastos',    color: '#6b7280', type: 'gasto' as const },
  // Ingresos
  { name: 'Sueldo',          color: '#10b981', type: 'ingreso' as const },
  { name: 'Freelance',       color: '#14b8a6', type: 'ingreso' as const },
  { name: 'Inversiones',     color: '#84cc16', type: 'ingreso' as const },
  { name: 'Otros ingresos',  color: '#a3a3a3', type: 'ingreso' as const },
]

export async function seedDefaultCategories(supabase: import('@supabase/supabase-js').SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from('categories')
    .select('name, type')
    .eq('user_id', userId)

  const existingKeys = new Set((existing ?? []).map(c => `${c.name}__${c.type}`))

  const missing = DEFAULT_CATEGORIES.filter(
    c => !existingKeys.has(`${c.name}__${c.type}`)
  ).map(c => ({ ...c, user_id: userId }))

  if (missing.length > 0) {
    await supabase.from('categories').insert(missing)
  }
}
