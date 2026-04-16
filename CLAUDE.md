@AGENTS.md

# GastosApp — Guía para Claude

## Qué es este proyecto

Aplicación web de finanzas personales para usuarios argentinos. Permite registrar ingresos y gastos, ver cotizaciones del dólar en tiempo real, importar resúmenes bancarios/Visa en Excel/PDF, escanear tickets con OCR, exportar reportes y gestionar metas de ahorro. Instalable como PWA.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 strict · Tailwind CSS 4 · Supabase (PostgreSQL + Auth + Realtime) · ExcelJS · jsPDF · Tesseract.js · Recharts · date-fns · Lucide React

---

## Comandos esenciales

```bash
npm run dev       # Desarrollo con Turbopack
npm run build     # Build de producción
npm run lint      # ESLint
npx tsc --noEmit  # Type check sin compilar
```

---

## Variables de entorno

Archivo `.env.local` en la raíz:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Arquitectura

### Estructura de carpetas

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Rutas protegidas (requieren auth)
│   │   ├── layout.tsx      # Layout principal con sidebar
│   │   ├── dashboard/
│   │   ├── transacciones/
│   │   ├── categorias/
│   │   ├── reportes/
│   │   ├── dolar/
│   │   ├── recurrentes/
│   │   ├── metas/
│   │   └── tendencias/
│   ├── api/                # Route handlers
│   │   ├── auth/login/
│   │   ├── parse-receipt/  # OCR con Tesseract.js
│   │   ├── parse-pdf/      # Parseo de resúmenes PDF
│   │   └── inflacion/
│   ├── login/
│   ├── register/
│   └── share-target/       # PWA Web Share Target
├── components/
│   ├── secciones/          # Componentes de página (uno por ruta)
│   │   ├── dashboard/
│   │   ├── transacciones/
│   │   ├── categorias/
│   │   └── ...
│   └── ui/                 # Componentes reutilizables
├── LogicService/           # Lógica de negocio pura por dominio
│   ├── auth/               # authService, debugSessionService
│   ├── dolar/              # dolarService (dolarapi.com, cache 5min)
│   ├── categorias/         # defaultCategoriesService
│   ├── recurrentes/        # recurringService
│   ├── tendencias/         # inflacionService
│   ├── secciones/          # Custom hooks y servicios de cada sección
│   │   ├── categorias/useCategorias.ts
│   │   ├── login/useLogin.ts
│   │   ├── metas/useMetas.ts
│   │   ├── recurrentes/useRecurrentes.ts
│   │   ├── register/useRegister.ts
│   │   ├── reportes/useReportes.ts
│   │   ├── tendencias/useTendencias.ts
│   │   └── transacciones/  # exportService, parsePdfService, parseMercadoPagoClient, parseReceiptService, autoCategorizeService, useTransacciones.ts
│   └── ui/                 # Custom hooks de componentes ui
│       ├── CategoryForm/useCategoryForm.ts
│       ├── DollarCard/useDollarCard.ts
│       ├── ExpenseChart/useExpenseChart.ts
│       ├── Header/useHeader.ts
│       ├── RecurringTrigger/useRecurringTrigger.ts
│       ├── ServiceWorkerRegister/useServiceWorkerRegister.ts
│       ├── Sidebar/useSidebar.ts
│       └── TransactionForm/useTransactionForm.ts
└── lib/
    ├── supabase/
    │   ├── client.ts       # createBrowserClient
    │   └── server.ts       # createServerClient (con cookies)
    ├── i18n/
    │   ├── index.ts        # Diccionarios ES/EN + getT(lang)
    │   └── LangContext.tsx # useLang() → { t, lang }
    └── types.ts
```

### Patrón de secciones

Cada ruta protegida sigue esta estructura:

```
components/secciones/[feature]/
  ├── [Feature]Section.tsx        # Componente 'use client' principal
  └── [feature]Section.styles.ts  # ClassNames: objeto con clases Tailwind

LogicService/secciones/[feature]/
  └── use[Feature].ts             # Custom hook: estado + queries Supabase
```

La página en `app/(app)/[feature]/page.tsx` simplemente importa y renderiza la sección.

### Patrón de componentes reutilizables

```
components/ui/[Component]/
  ├── index.tsx
  └── [Component].styles.ts

LogicService/ui/[Component]/
  └── use[Component].ts           # Custom hook del componente
```

### Server vs. Client components

- El layout `(app)/layout.tsx` es **server component**: verifica auth con el server client de Supabase.
- Las secciones son **client components** (`'use client'`): usan el browser client para queries reactivas y Realtime.
- Los API routes (`app/api/`) usan el server client.

---

## Base de datos (Supabase)

### Tablas principales

**`transactions`**
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS: `auth.uid() = user_id` |
| category_id | uuid FK nullable | |
| amount | decimal(12,2) | |
| currency | text | `'ARS'` o `'USD'` |
| description | text nullable | |
| date | date | |
| type | text | `'ingreso'` o `'gasto'` |
| created_at | timestamptz | |

**`categories`**
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS |
| name | text | |
| color | text | hex, default `#10b981` |
| type | text | `'ingreso'` o `'gasto'` |

También existen: `recurring_transactions`, `goals`.

**Seguridad:** Row Level Security activo en todas las tablas.

---

## Internacionalización

- Idiomas: español (`es`) e inglés (`en`)
- Almacenado en cookie `gastos_lang`
- En server components: `const lang = cookieStore.get(LANG_COOKIE)?.value`
- En client components: `const { t, lang } = useLang()`
- Diccionarios en `src/lib/i18n/index.ts`

---

## Convenciones de código

- **Clases Tailwind:** nunca inline en JSX. Extraer a `ClassNames` en `*.styles.ts`.
- **Lógica:** extraer a custom hooks `use[Feature].ts`, no en el componente.
- **Servicios:** funciones puras en `LogicService/`, sin estado React.
- **Importaciones de cliente pesado** (ExcelJS, jsPDF, Tesseract): siempre con `import()` dinámico para evitar problemas de SSR.
- **Fechas:** siempre con `date-fns`. Usar locale según `lang`.
- **Moneda:** `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`.

---

## Autenticación

- Login/register via Supabase Auth (email + password)
- Sesión persistida en cookies SSR via `@supabase/ssr`
- Middleware en `src/proxy.ts` protege rutas `/(app)/*`
- Server client: `src/lib/supabase/server.ts`
- Browser client: `src/lib/supabase/client.ts`

---

## Features especiales

### Importación de Excel y PDF
- ExcelJS lee `.xlsx` / `.xls`
- Detecta automáticamente: plantilla propia, extracto bancario, resumen Visa
- Importa extractos PDF de MercadoPago (`LogicService/transacciones/parseMercadoPagoClient.ts`)
- Auto-categoriza por keywords (`LogicService/transacciones/autoCategorizeService.ts`)
- Filtra duplicados antes de insertar

### Metas de ahorro
- CRUD de metas en ARS o USD con nombre, monto objetivo, fecha límite y color
- Barra de progreso por meta; metas en USD muestran equivalente en pesos (dólar blue)
- Resumen global: total de metas, total ahorrado y cuánto falta
- Hook: `LogicService/secciones/metas/useMetas.ts`

### OCR de tickets
- POST `/api/parse-receipt` con imagen (max 8MB)
- Tesseract.js server-side (configurado como `serverExternalPackages` en `next.config.ts`)
- Extrae fecha, monto, descripción → muestra modal de confirmación

### Cotización del dólar
- Fuente: `dolarapi.com` (sin API key)
- Tipos: oficial, blue, MEP, CCL, cripto
- Cache de 5 minutos via `{ revalidate: 300 }` en Next.js
- Servicio en `LogicService/dolar/dolarService.ts`

### PWA y Share Target
- Service Worker en `public/sw.js`
- `manifest.json` define `share_target` → `/share-target`
- Permite compartir imágenes de tickets directo desde la galería del celular

### Transacciones recurrentes
- Se procesan automáticamente al abrir la app (`RecurringTrigger` en layout)
- Evita duplicados comparando descripción + tipo

---

## Dashboard mensual

El dashboard usa URL parameter `?month=yyyy-MM` para navegación mensual:
- `page.tsx` lee `searchParams` (es Promise en Next.js 15+, hacer `await`)
- `DashboardSection` recibe `month?: string` y deriva los rangos de fechas
- `MonthNav.tsx` es el componente cliente con flechas `←` y `→`
