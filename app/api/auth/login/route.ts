import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const message = error.message.includes('Invalid login credentials')
      ? 'Email o contraseña incorrectos'
      : error.message
    return NextResponse.json({ error: message }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
