export interface InflacionDataPoint {
  fecha: string
  valor: number
}

export async function fetchInflacionData(): Promise<InflacionDataPoint[]> {
  const res = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion', {
    next: { revalidate: 21600 },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
