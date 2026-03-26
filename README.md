# GastosApp - Control de Finanzas Personales

Aplicación web para gestionar ingresos y gastos personales, pensada para usuarios argentinos. Incluye cotización del dólar en tiempo real, reportes con gráficos, exportación a Excel/PDF y soporte para instalar como app en el celular (PWA).

## Tecnologías

- **Next.js 16** (App Router + Turbopack)
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Auth + Base de datos + Realtime)
- **Recharts** (Gráficos)
- **jsPDF + xlsx** (Exportación)
- **Tesseract.js** (OCR para escaneo de comprobantes)
- **dolarapi.com** (Cotizaciones del dólar, sin API key)

## Características

### Transacciones
- Alta, edición y eliminación de transacciones (ingresos y gastos)
- Filtros por tipo, categoría y búsqueda por texto
- Paginación
- Sincronización en tiempo real con Supabase Realtime
- Importación desde Excel estándar (template descargable)
- Importación automática del resumen de tarjeta Visa (detecta el formato y parsea ARS y USD por separado)
- Exportación a Excel y PDF

### Escaneo de comprobantes
- Subí una foto de un ticket o comprobante y la app extrae automáticamente fecha, monto y descripción usando OCR (Tesseract.js)
- También podés compartir la imagen directamente desde la galería del celular gracias al Web Share Target (PWA)
- Los datos extraídos se muestran en un modal para confirmar o editar antes de guardar

### Recurrentes
- Definí ingresos y gastos que se repiten cada mes (sueldo, alquiler, servicios, etc.)
- Se registran automáticamente el día configurado cuando ingresás a la app
- Podés activar/desactivar cada uno, establecer una fecha de vencimiento y registrarlos manualmente en cualquier momento

### Metas financieras
- Creá metas de ahorro en ARS o USD con nombre, monto objetivo, fecha límite y color
- Barra de progreso por meta con equivalente en pesos (dólar blue) para metas en USD
- Sumá o restá ahorros en cualquier momento
- Resumen global: total de metas, total ahorrado y cuánto falta

### Auto-categorización
- Al importar comprobantes o extractos, la app intenta asignar categoría automáticamente según palabras clave en la descripción (supermercados, transporte, streaming, farmacias, etc.)
- Si la categoría no existe, la crea automáticamente

### Categorías
- CRUD completo con nombre, color y tipo (ingreso/gasto)
- Categorías predeterminadas al crear la cuenta

### Dashboard
- Resumen del mes: ingresos, gastos, balance y equivalente en USD
- Widgets de cotización del dólar blue y oficial

### Dólar
- Cotización en tiempo real de todos los tipos: oficial, blue, MEP, CCL, cripto
- Calculadora de cuántos dólares podés comprar según el superávit mensual

### Reportes
- Gráficos de barras, líneas y torta por categoría
- Filtros por período

### Autenticación
- Registro y login con Supabase Auth (email + contraseña)
- Sesión persistente con cookies SSR
- Logout desde el header

### PWA (Progressive Web App)
- Instalable en el celular como app nativa (sin barra de URL)
- Funciona en modo standalone (pantalla completa)
- Compartí imágenes directamente desde el celu para escanear comprobantes

---

## Configuración inicial

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/MaximilianoLihue/gastos-app.git
cd gastos-app
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear una cuenta
2. Crear un nuevo proyecto
3. Ir a **Settings > API** y copiar la `Project URL` y la `anon public key`

### 3. Configurar variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Crear las tablas en Supabase

1. Ir al dashboard de Supabase > **SQL Editor**
2. Crear las tablas `transactions`, `categories`, `recurring_transactions` y `goals` con RLS activado

Ver estructura completa en [`DATABASE.md`](./DATABASE.md).

### 5. (Opcional) Habilitar Realtime

En Supabase Dashboard > **Database > Replication**, activar `transactions` y `categories` en la publicación `supabase_realtime`.

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Estructura del proyecto

```
src/
  app/
    (app)/                  # Rutas protegidas (requieren auth)
      layout.tsx            # Layout con sidebar y header
      dashboard/            # Resumen del mes
      transacciones/        # CRUD de transacciones + importación
      categorias/           # CRUD de categorías
      reportes/             # Gráficos y reportes
      dolar/                # Cotizaciones del dólar
      recurrentes/          # Transacciones recurrentes automáticas
      metas/                # Metas de ahorro
    api/
      auth/login/           # Login server-side (SSR cookies)
      parse-receipt/        # OCR de comprobantes (Tesseract.js)
      parse-pdf/            # Parseo de PDFs
    login/                  # Página de login
    register/               # Página de registro
    share-target/           # Entrada de imágenes compartidas (PWA)
  components/
    Header/                 # Header con dropdown de logout
    Sidebar/                # Barra lateral de navegación
    TransactionForm/        # Modal crear/editar transacción
    CategoryForm/           # Modal crear/editar categoría
    ExpenseChart/           # Gráficos (Recharts)
    DollarCard/             # Tarjeta de cotización
    RecurringTrigger/       # Dispara procesamiento de recurrentes al cargar
    ServiceWorkerRegister/  # Registra el service worker (PWA)
  lib/
    supabase/
      client.ts             # Cliente Supabase para el browser
      server.ts             # Cliente Supabase para el servidor
      middleware.ts         # Middleware de autenticación
    autoCategorize.ts       # Auto-asignación de categorías por keywords
    defaultCategories.ts    # Categorías predeterminadas al registrarse
    recurring.ts            # Lógica de procesamiento de recurrentes
    dolar.ts                # Fetching de cotizaciones dolarapi.com
    export.ts               # Exportación a Excel y PDF
    parsePDF.ts             # Parseo de PDFs
    types.ts                # TypeScript types
  proxy.ts                  # Middleware de Next.js (protege rutas)
public/
  sw.js                     # Service Worker (PWA + Share Target)
  manifest.json             # Manifest PWA
  icons/                    # Íconos para instalación en dispositivos
```

Cada componente y página tiene:
- `*.styles.ts` — clases Tailwind extraídas
- `logic/use[Nombre].ts` — lógica en custom hook

---

## Deploy en Vercel

1. Subir el código a GitHub
2. Ir a [vercel.com](https://vercel.com) y crear un nuevo proyecto
3. Conectar el repositorio
4. Agregar las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

---

## API de Dólar

Usa [dolarapi.com](https://dolarapi.com) — gratuita, sin API key.

| Endpoint | Tipo |
|----------|------|
| `GET /v1/dolares` | Todos los tipos |
| `GET /v1/dolares/oficial` | Oficial |
| `GET /v1/dolares/blue` | Blue |
| `GET /v1/dolares/bolsa` | MEP |
| `GET /v1/dolares/contadoconliqui` | CCL |
| `GET /v1/dolares/cripto` | Cripto (USDT) |
