import { createWorker } from 'tesseract.js'

export interface ParsedReceipt {
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'gasto'
}

function extractDate(text: string): string {
  const today = new Date().toISOString().split('T')[0]
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const day = m[1].padStart(2, '0')
      const month = m[2].padStart(2, '0')
      const year = m[3].length === 2 ? `20${m[3]}` : m[3]
      const d = parseInt(day), mo = parseInt(month), y = parseInt(year)
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2099) {
        return `${year}-${month}-${day}`
      }
    }
  }
  return today
}

function extractAmount(text: string): number {
  const lines = text.split('\n')
  const priority = ['total', 'importe', 'a pagar', 'monto', 'subtotal']

  for (const keyword of priority) {
    for (const line of lines) {
      if (line.toLowerCase().includes(keyword)) {
        const m = line.match(/[\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/)
        if (m) {
          const num = parseFloat(m[0].replace(/\./g, '').replace(',', '.'))
          if (num > 0) return num
        }
      }
    }
  }

  const amounts: number[] = []
  const re = /\$\s*([\d]{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const num = parseFloat(match[1].replace(/[.\s]/g, '').replace(',', '.'))
    if (num > 0) amounts.push(num)
  }
  if (amounts.length > 0) return Math.max(...amounts)

  const nums = [...text.matchAll(/\b(\d{2,}(?:[.,]\d{2})?)\b/g)]
    .map(m => parseFloat(m[1].replace(',', '.')))
    .filter(n => n > 10)
  return nums.length > 0 ? Math.max(...nums) : 0
}

function extractDescription(text: string): string {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2 && !/^\d+$/.test(l))

  const skip = /^[\d\/\-\$.,\s]+$|cuit|iva|cae|comprobante|recibo|factura\s*[a-z]?\s*\d|numero|nro\.|tel\.|domicilio|atencion|gracias/i

  for (const line of lines) {
    if (!skip.test(line) && line.length >= 3) {
      return line.charAt(0).toUpperCase() + line.slice(1).toLowerCase()
    }
  }

  return lines[0] ?? 'Comprobante'
}

export async function parseReceiptImage(buffer: Buffer): Promise<ParsedReceipt> {
  const worker = await createWorker('spa', 1, { logger: () => {} })
  const { data: { text } } = await worker.recognize(buffer)
  await worker.terminate()

  if (!text || text.trim().length < 5) {
    throw new Error('No se pudo leer texto en la imagen')
  }

  const date = extractDate(text)
  const amount = extractAmount(text)
  const description = extractDescription(text)

  if (amount === 0) {
    throw new Error('No se encontró monto en el comprobante')
  }

  return { date, description, amount, type: 'gasto' }
}
