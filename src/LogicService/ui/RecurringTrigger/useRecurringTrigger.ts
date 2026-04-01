import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { processRecurring } from '@/LogicService/recurrentes/recurringService'
import { seedDefaultCategories } from '@/LogicService/categorias/defaultCategoriesService'
import { autoCategorizeExisting } from '@/LogicService/secciones/transacciones/autoCategorizeService'

export function useRecurringTrigger() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      await seedDefaultCategories(supabase, user.id)
      await autoCategorizeExisting(supabase)
      processRecurring(supabase)
    })
  }, [])
}
