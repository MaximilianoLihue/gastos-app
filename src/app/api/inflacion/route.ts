import { NextResponse } from 'next/server'
import { fetchInflacionData } from '@/LogicService/tendencias/inflacionService'

export async function GET() {
  try {
    const data = await fetchInflacionData()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[inflacion]', err)
    return NextResponse.json({ error: 'No se pudo obtener la inflación' }, { status: 500 })
  }
}
