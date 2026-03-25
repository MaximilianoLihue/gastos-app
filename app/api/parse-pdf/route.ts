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

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // Server-side pdfjs — no worker needed in Node.js
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs' as string)
  // Disable worker for server-side use
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += ' ' + content.items.map((item: unknown) => (item as { str: string }).str).join(' ')
  }
  return text
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const text = await extractTextFromPDF(buffer)

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
