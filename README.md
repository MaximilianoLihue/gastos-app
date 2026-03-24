# GastosApp - Control de Finanzas Personales

Aplicación web para gestionar ingresos y gastos personales, pensada para usuarios argentinos. Incluye cotización del dólar en tiempo real, reportes con gráficos y exportación a Excel/PDF.

## Tecnologías

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Auth + Base de datos + Realtime)
- **Recharts** (Gráficos)
- **jsPDF + xlsx** (Exportación)
- **dolarapi.com** (Cotizaciones del dólar, sin API key)

## Características

- Autenticación con Supabase Auth (registro + login)
- Dashboard con resumen del mes (ingresos, gastos, balance, USD equivalente)
- Gestión de transacciones (CRUD) con filtros, búsqueda y paginación
- Gestión de categorías con colores personalizados
- Reportes con gráficos de barras, líneas y torta por categoría
- Exportación a Excel y PDF
- Cotización de todos los tipos de dólar (oficial, blue, MEP, CCL, cripto)
- Calculadora de USD posibles según superávit mensual
- Sincronización en tiempo real con Supabase Realtime
- Diseño responsive y mobile-friendly

## Configuración inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd gastos-app
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear una cuenta
2. Crear un nuevo proyecto
3. Ir a **Settings > API** y copiar:
   - `Project URL`
   - `anon public key`

### 3. Configurar variables de entorno

Editar el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Crear las tablas en Supabase

1. Ir al dashboard de Supabase
2. Ir a **SQL Editor**
3. Copiar y ejecutar el contenido de `supabase/migrations/001_schema.sql`

### 5. (Opcional) Habilitar Realtime

En Supabase Dashboard:
1. Ir a **Database > Replication**
2. Activar `transactions` y `categories` en la publicación `supabase_realtime`

### 6. Configurar autenticación

En Supabase Dashboard:
1. Ir a **Authentication > Email Templates** para personalizar los emails
2. En **Authentication > URL Configuration**, agregar `http://localhost:3000` como URL de redirección
3. Para producción, también agregar tu dominio de producción

### 7. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Estructura del proyecto

```
app/
  (app)/              # Rutas protegidas (requieren auth)
    layout.tsx        # Layout con sidebar y header
    dashboard/        # Página principal con resumen
    transacciones/    # Gestión de transacciones
    categorias/       # Gestión de categorías
    reportes/         # Gráficos y reportes
    dolar/            # Cotizaciones del dólar
  login/              # Página de login
  register/           # Página de registro
  layout.tsx          # Layout raíz
  page.tsx            # Redirección inicial
components/
  Sidebar.tsx         # Barra lateral de navegación
  Header.tsx          # Header con nombre de página
  TransactionForm.tsx # Modal para crear/editar transacciones
  CategoryForm.tsx    # Modal para crear/editar categorías
  ExpenseChart.tsx    # Componentes de gráficos (Recharts)
  DollarCard.tsx      # Tarjeta de cotización de dólar
lib/
  supabase/
    client.ts         # Cliente Supabase para el browser
    server.ts         # Cliente Supabase para el servidor
    middleware.ts     # Middleware de autenticación
  dolar.ts            # Fetching de cotizaciones dolarapi.com
  export.ts           # Funciones de exportación Excel/PDF
  types.ts            # TypeScript types
middleware.ts         # Middleware de Next.js para proteger rutas
supabase/
  migrations/
    001_schema.sql    # Schema SQL completo
```

## Deploy en Vercel

1. Hacer fork o subir el código a GitHub
2. Ir a [vercel.com](https://vercel.com) y crear un nuevo proyecto
3. Conectar el repositorio de GitHub
4. Agregar las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Hacer deploy

## API de Dólar

Este proyecto usa [dolarapi.com](https://dolarapi.com) que es gratuita y no requiere API key.

Endpoints utilizados:
- `GET https://dolarapi.com/v1/dolares` - Todos los tipos de cambio
- `GET https://dolarapi.com/v1/dolares/oficial` - Dólar oficial
- `GET https://dolarapi.com/v1/dolares/blue` - Dólar blue
- `GET https://dolarapi.com/v1/dolares/bolsa` - Dólar MEP
- `GET https://dolarapi.com/v1/dolares/contadoconliqui` - CCL
- `GET https://dolarapi.com/v1/dolares/cripto` - Dólar cripto (USDT)
