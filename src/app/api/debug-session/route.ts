import { NextRequest, NextResponse } from 'next/server'
import { getSessionDebugInfo } from '@/LogicService/auth/debugSessionService'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const info = await getSessionDebugInfo(req)
  return NextResponse.json(info)
}
