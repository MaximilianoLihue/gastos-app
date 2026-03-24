import { DolarRate, DolarSummary } from './types'

const BASE_URL = 'https://dolarapi.com/v1'

export async function fetchAllDolarRates(): Promise<DolarSummary> {
  try {
    const response = await fetch(`${BASE_URL}/dolares`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error('Failed to fetch dollar rates')
    }

    const data: Array<{ casa: string; nombre: string; compra: number; venta: number; fechaActualizacion?: string }> =
      await response.json()

    const find = (casa: string): DolarRate | null => {
      const item = data.find(
        (d) => d.casa.toLowerCase() === casa.toLowerCase()
      )
      if (!item) return null
      return {
        nombre: item.nombre,
        compra: item.compra,
        venta: item.venta,
        fechaActualizacion: item.fechaActualizacion,
      }
    }

    return {
      oficial: find('oficial'),
      blue: find('blue'),
      mep: find('bolsa'),
      ccl: find('contadoconliqui'),
      cripto: find('cripto'),
    }
  } catch (error) {
    console.error('Error fetching dollar rates:', error)
    return {
      oficial: null,
      blue: null,
      mep: null,
      ccl: null,
      cripto: null,
    }
  }
}

export async function fetchDolarRate(
  tipo: 'oficial' | 'blue' | 'bolsa' | 'contadoconliqui' | 'cripto'
): Promise<DolarRate | null> {
  try {
    const response = await fetch(`${BASE_URL}/dolares/${tipo}`, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      nombre: data.nombre,
      compra: data.compra,
      venta: data.venta,
      fechaActualizacion: data.fechaActualizacion,
    }
  } catch {
    return null
  }
}

export function calcularUSDPosibles(
  surplus: number,
  rates: DolarSummary
): { blue: number | null; oficial: number | null } {
  if (surplus <= 0) {
    return { blue: null, oficial: null }
  }

  const blue =
    rates.blue?.venta && rates.blue.venta > 0
      ? surplus / rates.blue.venta
      : null

  const oficial =
    rates.oficial?.venta && rates.oficial.venta > 0
      ? surplus / rates.oficial.venta
      : null

  return { blue, oficial }
}

export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(valor)
}

export function formatearUSD(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(valor)
}
