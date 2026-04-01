import { DashboardSection } from '@/components/secciones/dashboard/DashboardSection'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  return <DashboardSection month={month} />
}
