import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function getSessionDebugInfo(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  const cookies = req.cookies.getAll().map(c => ({
    name: c.name,
    length: c.value.length,
  }))

  return {
    user: user?.email ?? null,
    error: error?.message ?? null,
    cookies,
  }
}
