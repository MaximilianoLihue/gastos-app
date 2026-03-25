export interface ParsedPDFTransaction {
  date: string        // yyyy-MM-dd
  description: string
  amount: number
  type: 'ingreso' | 'gasto'
}

function toISODate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('-')
  return `${year}-${month}-${day}`
}

function parseARSAmount(str: string): number {
  // Argentine format: "4,44" | "-196.968,32" | "1.694,11"
  const clean = str.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')
  return parseFloat(clean) || 0
}

export async function parseMercadoPagoPDF(file: File): Promise<ParsedPDFTransaction[]> {
  const pdfjsLib = await import('pdfjs-dist')

  // Use CDN worker to avoid Next.js webpack/worker config issues
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise

  let allText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(' ')
    allText += ' ' + pageText
  }

  // Row pattern: DD-MM-YYYY  description  operationId(10+digits)  $ value  $ balance
  // Value can be negative: $ -196.968,32
  const rowRegex = /(\d{2}-\d{2}-\d{4})\s+([\s\S]+?)\s+(\d{10,})\s+\$\s*(-?[\d.,]+)\s+\$\s*[\d.,]+/g

  const results: ParsedPDFTransaction[] = []
  let match: RegExpExecArray | null

  while ((match = rowRegex.exec(allText)) !== null) {
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
