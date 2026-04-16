---
name: frontend-conventions
description: Convenciones personales de arquitectura frontend. Cargar al crear o modificar componentes, hooks, servicios o estructura de carpetas en proyectos React/Next.js
---

## Estructura de carpetas

src/
├── app/                        # Next.js App Router
├── components/
│   ├── secciones/              # Un componente grande por ruta, usado una sola vez
│   └── ui/                     # Componentes reutilizables
├── LogicService/               # Lógica de negocio pura por dominio
└── lib/                        # Utilidades, clientes, tipos globales

## Naming

- Componentes: PascalCase → TransactionCard.tsx
- Hooks: camelCase → useTransactions.ts
- Servicios: camelCase + sufijo Service → dolarService.ts
- Carpetas: kebab-case o camelCase según el contexto
- Estilos: mismo nombre que el componente → TransactionCard.module.scss

## Estilos

- Cada componente tiene su propio archivo SCSS module si necesita estilos
- El archivo vive junto al componente en la misma carpeta
- Usar CSS Modules siempre (nunca estilos globales en componentes)

TransactionCard/
├── TransactionCard.tsx
├── TransactionCard.module.scss
└── index.ts

// En el componente
import styles from './TransactionCard.module.scss'

## Exports

- Componentes → named export
- Páginas (page.tsx) → default export
- Barrel files index.ts en todas las carpetas

// Componente
export const TransactionCard = () => {}

// Página
export default function DashboardPage() {}

// index.ts
export { TransactionCard } from './TransactionCard'

## Props

- Siempre type, nunca interface

type TransactionCardProps = {
  id: string
  amount: number
  currency: 'ARS' | 'USD'
}

## Orden de imports

// 1. React
import { useState, useEffect } from 'react'

// 2. Externos
import { format } from 'date-fns'

// 3. Internos
import { useTransactions } from '@/hooks/useTransactions'
import { dolarService } from '@/LogicService/dolar/dolarService'

## Lógica y estado

- Extraer siempre a hooks custom, nunca lógica pesada dentro del componente
- Lógica de negocio pura → LogicService/
- Estado y efectos UI → hook custom en hooks/

// ✅ Correcto
const { transactions, isLoading } = useTransactions()

// ❌ Evitar
const [transactions, setTransactions] = useState([])
useEffect(() => { fetchTransactions().then(...) }, [])