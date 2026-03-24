'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { processRecurring } from '@/lib/recurring'
import { seedDefaultCategories } from '@/lib/defaultCategories'
import { autoCategorizeExisting } from '@/lib/autoCategorize'

export default function RecurringTrigger() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      await seedDefaultCategories(supabase, user.id)
      await autoCategorizeExisting(supabase)
      processRecurring(supabase)
    })
  }, [])

  return null
}
