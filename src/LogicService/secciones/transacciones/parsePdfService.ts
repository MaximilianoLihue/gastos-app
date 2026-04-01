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

export async function parsePdfTransactions(buffer: Buffer): Promise<ParsedPDFTransaction[]> {
  // Import the internal module directly to avoid pdf-parse's test-file check in Next.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse')
  const data = await pdfParse(buffer)
  const text: string = data.text

  // Mercado Pago format: date on its own line, description on next line(s),
  // then opId$value$balance all on one line (no spaces between opId and $)
  const rowRegex = /(\d{2}-\d{2}-\d{4})\n([\s\S]+?)\n(\d{10,})\$\s*(-?[\d.,]+)\$\s*[\d.,]+/g

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

  return results
}
