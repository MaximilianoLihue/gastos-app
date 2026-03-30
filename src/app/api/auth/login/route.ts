import { NextRequest, NextResponse } from 'next/server'
import { loginWithPassword } from '@/LogicService/authService'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const { error } = await loginWithPassword(email, password)

  if (error) return NextResponse.json({ error }, { status: 401 })
  return NextResponse.json({ ok: true })
}
