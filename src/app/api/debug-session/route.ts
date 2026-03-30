import { NextRequest, NextResponse } from 'next/server'
import { getSessionDebugInfo } from '@/LogicService/debugSessionService'

export async function GET(req: NextRequest) {
  const info = await getSessionDebugInfo(req)
  return NextResponse.json(info)
}
