export type TransactionType = 'ingreso' | 'gasto'

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  type: TransactionType
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  description: string | null
  date: string
  type: TransactionType
  created_at: string
  category?: Category
}

export interface DolarRate {
  nombre: string
  compra: number
  venta: number
  fechaActualizacion?: string
}

export interface DolarSummary {
  oficial: DolarRate | null
  blue: DolarRate | null
  mep: DolarRate | null
  ccl: DolarRate | null
  cripto: DolarRate | null
}

export interface DashboardStats {
  totalIngresos: number
  totalGastos: number
  balance: number
  surplus: number
}

export interface MonthlyData {
  month: string
  ingresos: number
  gastos: number
}

export interface CategoryData {
  name: string
  value: number
  color: string
}
