export interface ParsedPDFTransaction {
  date: string
  description: string
  amount: number
  type: 'ingreso' | 'gasto'
}

export async function parseMercadoPagoPDF(file: File): Promise<ParsedPDFTransaction[]> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? 'Error al procesar el PDF')
  }

  const { transactions } = await res.json()
  return transactions as ParsedPDFTransaction[]
}
