import { NextRequest, NextResponse } from 'next/server'
import { parsePdfTransactions } from '@/LogicService/secciones/transacciones/parsePdfService'

const MAX_PDF_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 415 })
    }
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 20 MB limit.' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const transactions = await parsePdfTransactions(buffer)
    return NextResponse.json({ transactions })
  } catch (err) {
    console.error('[parse-pdf]', err)
    return NextResponse.json({ error: 'Error al procesar el PDF' }, { status: 500 })
  }
}
