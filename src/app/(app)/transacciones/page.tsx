import { Suspense } from 'react'
import { TransaccionesSection } from '@/secciones/transacciones/TransaccionesSection'

export default function TransaccionesPage() {
  return (
    <Suspense>
      <TransaccionesSection />
    </Suspense>
  )
}
