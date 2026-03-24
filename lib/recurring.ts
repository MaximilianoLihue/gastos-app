import { SupabaseClient } from '@supabase/supabase-js'
import { format, getDate } from 'date-fns'

/**
 * Auto-inserts active recurring transactions that are due this month.
 * Checks if a transaction with the same description already exists for the current month.
 */
export async function processRecurring(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date()
  const todayDay = getDate(today)
  const currentMonth = format(today, 'yyyy-MM')

  // Get all active recurring transactions due on or before today this month
  // Filter out ones past their end_date
  const { data: recurring } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .lte('day_of_month', todayDay)
    .or(`end_date.is.null,end_date.gte.${format(today, 'yyyy-MM-01')}`)

  if (!recurring || recurring.length === 0) return

  // Get existing transactions this month to avoid duplicates
  const { data: existing } = await supabase
    .from('transactions')
    .select('description, type')
    .eq('user_id', user.id)
    .gte('date', `${currentMonth}-01`)
    .lte('date', `${currentMonth}-31`)

  const existingKeys = new Set(
    (existing ?? []).map(t => `${t.description}__${t.type}`)
  )

  const toInsert = recurring
    .filter(r => !existingKeys.has(`${r.description}__${r.type}`))
    .map(r => ({
      user_id: user.id,
      description: r.description,
      amount: r.amount,
      type: r.type,
      category_id: r.category_id,
      date: format(
        new Date(today.getFullYear(), today.getMonth(), r.day_of_month),
        'yyyy-MM-dd'
      ),
    }))

  if (toInsert.length > 0) {
    await supabase.from('transactions').insert(toInsert)
  }
}
