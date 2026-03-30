import { NextRequest, NextResponse } from 'next/server'
import { parseReceiptImage } from '@/LogicService/parseReceiptService'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const transaction = await parseReceiptImage(buffer)
    return NextResponse.json({ transaction })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes('No se pudo leer') || message.includes('No se encontró') ? 422 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
