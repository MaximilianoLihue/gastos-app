import { SupabaseClient } from '@supabase/supabase-js'

const AUTO_CATEGORY_RULES: { keywords: string[]; category: string; color: string }[] = [
  { keywords: ['transferencia', 'transf ', 'trnsf', 'acreditacion', 'acreditación', 'extraccion', 'extracción', 'reintegro', 'devolucion', 'devolución', 'mercado pago', 'mercadopago', 'cuenta dni', 'ualá', 'uala', 'brubank', 'naranja x', 'naranjax', 'prex', 'bimo'], category: 'Transferencias', color: '#6366f1' },
  { keywords: ['uber', 'cabify', 'remis', 'taxi', 'sube', 'colectivo', 'tren', 'subte', 'ypf', 'shell', 'axion', 'nafta', 'combustible', 'peaje'], category: 'Transporte', color: '#3b82f6' },
  { keywords: ['supermercado', 'disco', 'jumbo', 'carrefour', 'coto', 'dia ', 'vea ', 'walmart', 'vital', 'verduleria', 'almacen'], category: 'Comida', color: '#f97316' },
  { keywords: ['rappi', 'pedidosya', 'mcdonalds', 'burger king', 'kentucky', 'subway', 'mostaza', 'restaurant', 'pizza', 'sushi', 'delivery'], category: 'Comida', color: '#f97316' },
  { keywords: ['netflix', 'spotify', 'disney', 'hbo', 'flow', 'paramount', 'steam', 'playstation', 'xbox'], category: 'Entretenimiento', color: '#a855f7' },
  { keywords: ['farmacia', 'farma', 'drogueria', 'medico', 'doctor', 'clinica', 'hospital', 'osde', 'swiss', 'prepaga', 'obra social'], category: 'Salud', color: '#ec4899' },
  { keywords: ['edesur', 'edenor', 'metrogas', 'aysa', 'telecom', 'fibertel', 'cablevision'], category: 'Servicios', color: '#eab308' },
  { keywords: ['alquiler', 'expensas', 'inmobiliaria'], category: 'Vivienda', color: '#14b8a6' },
  { keywords: ['zara', 'h&m', 'lacoste', 'adidas', 'nike', 'calzado', 'indumentaria', 'falabella'], category: 'Ropa', color: '#f43f5e' },
  { keywords: ['suscripcion', 'suscripción', 'rescate', 'fima', 'fondo', 'cuotaparte', 'gainvest', 'balanz', 'iol', 'invertironline', 'ppx', 'adcap', 'puente', 'portfolio personal', 'sigma', 'pellegrini', 'premier', 'clase a', 'clase b', 'renta fija', 'renta variable'], category: 'Inversiones', color: '#84cc16' },
  { keywords: ['sueldo', 'salario', 'haberes', 'remuneracion'], category: 'Sueldo', color: '#10b981' },
  { keywords: ['freelance', 'honorarios', 'factura'], category: 'Freelance', color: '#14b8a6' },
]

export function guessCategory(description: string): { category: string; color: string } | null {
  const lower = description.toLowerCase()
  for (const rule of AUTO_CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { category: rule.category, color: rule.color }
    }
  }
  return null
}

export async function autoCategorizeExisting(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Get all transactions without a category
  const { data: uncategorized } = await supabase
    .from('transactions')
    .select('id, description, type')
    .eq('user_id', user.id)
    .is('category_id', null)
    .not('description', 'is', null)

  if (!uncategorized || uncategorized.length === 0) return

  // Load existing categories
  const { data: existingCats } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', user.id)

  const catCache: Record<string, string> = {}
  for (const c of existingCats ?? []) {
    catCache[`${c.name.toLowerCase()}__${c.type}`] = c.id
  }

  const ensureCategory = async (name: string, type: string, color: string): Promise<string | null> => {
    const key = `${name.toLowerCase()}__${type}`
    if (catCache[key]) return catCache[key]
    const { data } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name, type, color })
      .select('id')
      .single()
    if (data?.id) catCache[key] = data.id
    return data?.id ?? null
  }

  // Process in batches to avoid too many requests
  const updates: { id: string; category_id: string }[] = []

  for (const tx of uncategorized) {
    if (!tx.description) continue
    const guessed = guessCategory(tx.description)
    if (!guessed) continue
    const category_id = await ensureCategory(guessed.category, tx.type, guessed.color)
    if (category_id) updates.push({ id: tx.id, category_id })
  }

  // Update in batches of 50
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50)
    await Promise.all(
      batch.map(({ id, category_id }) =>
        supabase.from('transactions').update({ category_id }).eq('id', id)
      )
    )
  }
}
