import { Transaction, Category } from './types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function exportToExcel(
  transactions: Transaction[],
  filename: string = 'transacciones'
): void {
  // Dynamic import to avoid SSR issues
  import('xlsx').then((XLSX) => {
    const data = transactions.map((t) => ({
      Fecha: format(new Date(t.date), 'dd/MM/yyyy', { locale: es }),
      Tipo: t.type === 'ingreso' ? 'Ingreso' : 'Gasto',
      Categoría: t.category?.name || 'Sin categoría',
      Descripción: t.description || '',
      Monto: t.type === 'ingreso' ? t.amount : -t.amount,
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones')

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
    ]

    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  })
}

export async function exportToPDF(
  transactions: Transaction[],
  stats: { totalIngresos: number; totalGastos: number; balance: number },
  period: string = ''
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.setTextColor(16, 185, 129) // emerald-500
  doc.text('GastosApp - Reporte de Transacciones', 20, 25)

  // Period
  if (period) {
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Período: ${period}`, 20, 35)
  }

  // Summary box
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Resumen', 20, 50)

  doc.setFontSize(11)
  doc.setTextColor(16, 185, 129)
  doc.text(
    `Total Ingresos: ${formatARS(stats.totalIngresos)}`,
    20,
    60
  )
  doc.setTextColor(239, 68, 68)
  doc.text(
    `Total Gastos: ${formatARS(stats.totalGastos)}`,
    20,
    70
  )
  doc.setTextColor(stats.balance >= 0 ? 16 : 239, stats.balance >= 0 ? 185 : 68, stats.balance >= 0 ? 129 : 68)
  doc.text(`Balance: ${formatARS(stats.balance)}`, 20, 80)

  // Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 88, 190, 88)

  // Table header
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text('Fecha', 20, 98)
  doc.text('Tipo', 50, 98)
  doc.text('Categoría', 75, 98)
  doc.text('Descripción', 115, 98)
  doc.text('Monto', 165, 98)

  doc.line(20, 101, 190, 101)

  // Table rows
  let y = 110
  const pageHeight = 280

  for (const t of transactions) {
    if (y > pageHeight) {
      doc.addPage()
      y = 20
    }

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(format(new Date(t.date), 'dd/MM/yy', { locale: es }), 20, y)
    doc.setTextColor(t.type === 'ingreso' ? 16 : 239, t.type === 'ingreso' ? 185 : 68, t.type === 'ingreso' ? 129 : 68)
    doc.text(t.type === 'ingreso' ? 'Ingreso' : 'Gasto', 50, y)
    doc.setTextColor(0, 0, 0)
    doc.text((t.category?.name || 'S/C').substring(0, 15), 75, y)
    doc.text((t.description || '').substring(0, 20), 115, y)

    const monto = t.type === 'gasto' ? -t.amount : t.amount
    doc.setTextColor(monto >= 0 ? 16 : 239, monto >= 0 ? 185 : 68, monto >= 0 ? 129 : 68)
    doc.text(formatARS(monto), 165, y)

    y += 8
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `GastosApp - Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
      20,
      290
    )
    doc.text(`Página ${i} de ${totalPages}`, 170, 290)
  }

  doc.save(`reporte_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value)
}
