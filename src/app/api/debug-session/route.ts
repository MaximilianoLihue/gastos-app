import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  const allCookies = req.cookies.getAll().map(c => ({
    name: c.name,
    length: c.value.length,
  }))

  return NextResponse.json({
    user: user?.email ?? null,
    error: error?.message ?? null,
    cookies: allCookies,
  })
}
