import { NextRequest, NextResponse } from 'next/server'
import { parseReceiptImage } from '@/LogicService/secciones/transacciones/parseReceiptService'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo imágenes.' }, { status: 415 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo supera el límite de 8 MB.' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const transaction = await parseReceiptImage(buffer)
    return NextResponse.json({ transaction })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isUserFacing = message.includes('No se pudo leer') || message.includes('No se encontró')
    return NextResponse.json(
      { error: isUserFacing ? message : 'Error al procesar el comprobante' },
      { status: isUserFacing ? 422 : 500 }
    )
  }
}
