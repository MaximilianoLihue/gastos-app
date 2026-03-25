import { NextRequest, NextResponse } from 'next/server'

export interface ParsedPDFTransaction {
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'gasto'
}

function toISODate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('-')
  return `${year}-${month}-${day}`
}

function parseARSAmount(str: string): number {
  const clean = str.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')
  return parseFloat(clean) || 0
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = ((await import('pdf-parse')) as any).default
    const data = await pdfParse(buffer)
    const text: string = data.text

    // Pattern: DD-MM-YYYY  description  opId(10+digits)  $ value  $ balance
    const rowRegex = /(\d{2}-\d{2}-\d{4})\s+([\s\S]+?)\s+(\d{10,})\s+\$\s*(-?[\d.,]+)\s+\$\s*[\d.,]+/g

    const results: ParsedPDFTransaction[] = []
    let match: RegExpExecArray | null

    while ((match = rowRegex.exec(text)) !== null) {
      const [, dateStr, rawDesc, , valueStr] = match
      const value = parseARSAmount(valueStr)
      if (value === 0) continue
      results.push({
        date: toISODate(dateStr),
        description: rawDesc.replace(/\s+/g, ' ').trim(),
        amount: Math.abs(value),
        type: value > 0 ? 'ingreso' : 'gasto',
      })
    }

    return NextResponse.json({ transactions: results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
