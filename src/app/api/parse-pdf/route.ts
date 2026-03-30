import { NextRequest, NextResponse } from 'next/server'
import { parsePdfTransactions } from '@/LogicService/parsePdfService'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const transactions = await parsePdfTransactions(buffer)
    return NextResponse.json({ transactions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
