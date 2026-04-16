# GastosApp — Personal Finance Manager

> **[English](#english) | [Español](#español)**

---

<a name="english"></a>
# English

A web app to manage personal income and expenses, built for Argentine users. Includes real-time dollar exchange rates, charts and reports, Excel/PDF export, receipt scanning via OCR, monthly dashboard navigation, and PWA support (installable on mobile).

## Tech Stack

- **Next.js 16** (App Router + Turbopack)
- **TypeScript 5** (strict)
- **Tailwind CSS 4**
- **Supabase** (Auth + Database + Realtime)
- **Recharts** (Charts)
- **ExcelJS + jsPDF** (Export)
- **Tesseract.js** (OCR for receipt scanning)
- **dolarapi.com** (Dollar rates, no API key required)
- **date-fns** (Date formatting and manipulation)

## Features

### Transactions
- Create, edit, and delete transactions (income and expenses)
- Filter by type, category, and text search
- Pagination
- Real-time sync via Supabase Realtime
- Import from standard Excel template (downloadable)
- Automatic import of Visa credit card statements (detects format, parses ARS and USD separately)
- Import from MercadoPago PDF statements
- Export to Excel and PDF

### Receipt Scanning
- Upload a photo of a receipt and the app automatically extracts date, amount, and description via OCR (Tesseract.js)
- Share images directly from your phone's gallery via Web Share Target (PWA)
- Extracted data is shown in a confirmation modal before saving

### Recurring Transactions
- Define monthly recurring income and expenses (salary, rent, utilities, etc.)
- Automatically registered on the configured day when you open the app
- Enable/disable each one, set an expiration date, or register manually at any time

### Financial Goals
- Create savings goals in ARS or USD with name, target amount, deadline, and color
- Progress bar per goal with peso equivalent (blue dollar) for USD goals
- Add or subtract savings at any time
- Global summary: total goals, total saved, and amount remaining

### Auto-categorization
- When importing receipts or statements, the app attempts to auto-assign a category based on keywords in the description (supermarkets, transport, streaming, pharmacies, etc.)
- If the category doesn't exist, it's created automatically

### Categories
- Full CRUD with name, color, and type (income/expense)
- Default categories created on registration

### Dashboard
- Month-by-month navigation with `←` / `→` arrows (`?month=yyyy-MM`)
- Monthly summary: income, expenses, balance, and USD equivalent
- Spending alerts: spikes, high-share categories, and new categories
- Top spending categories with percentage breakdown
- Blue and official dollar rate widgets

### Inflation Trends
- Historical inflation data by category
- Compare spending evolution over time

### Dollar Rates
- Real-time rates for all types: official, blue, MEP, CCL, crypto
- Calculator showing how many dollars you can buy based on your monthly surplus

### Reports
- Bar, line, and pie charts by category
- Period filters

### Authentication
- Sign up and log in with Supabase Auth (email + password)
- Persistent session with SSR cookies
- Logout from the sidebar

### PWA (Progressive Web App)
- Installable on mobile as a native-like app (no URL bar)
- Works in standalone mode (fullscreen)
- Share images directly from your phone to scan receipts

### Language
- Full English / Spanish support — toggle in the sidebar, preference saved in a cookie

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/MaximilianoLihue/gastos-app.git
cd gastos-app
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Go to **Settings > API** and copy the `Project URL` and `anon public key`

### 3. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Create database tables

Go to Supabase Dashboard > **SQL Editor** and create the following tables with RLS enabled:
`transactions`, `categories`, `recurring_transactions`, `goals`

See full schema in [`DATABASE.md`](./DATABASE.md).

### 5. (Optional) Enable Realtime

In Supabase Dashboard > **Database > Replication**, enable `transactions` and `categories` on the `supabase_realtime` publication.

### 6. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

See full architecture in [`CLAUDE.md`](./CLAUDE.md#arquitectura).

Each section component has a matching `*.styles.ts` with extracted Tailwind class constants.

---

## Deploy to Vercel

1. Push the code to GitHub
2. Go to [vercel.com](https://vercel.com) and create a new project
3. Connect the repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

---

## Dollar API

Uses [dolarapi.com](https://dolarapi.com) — free, no API key required.

| Endpoint | Type |
|----------|------|
| `GET /v1/dolares` | All types |
| `GET /v1/dolares/oficial` | Official |
| `GET /v1/dolares/blue` | Blue |
| `GET /v1/dolares/bolsa` | MEP |
| `GET /v1/dolares/contadoconliqui` | CCL |
| `GET /v1/dolares/cripto` | Crypto (USDT) |

---

<a name="español"></a>
# Español

Aplicación web para gestionar ingresos y gastos personales, pensada para usuarios argentinos. Incluye cotización del dólar en tiempo real, reportes con gráficos, exportación a Excel/PDF, escaneo de comprobantes por OCR, navegación mes a mes en el dashboard y soporte para instalar como app en el celular (PWA).

## Tecnologías

- **Next.js 16** (App Router + Turbopack)
- **TypeScript 5** (strict)
- **Tailwind CSS 4**
- **Supabase** (Auth + Base de datos + Realtime)
- **Recharts** (Gráficos)
- **ExcelJS + jsPDF** (Exportación)
- **Tesseract.js** (OCR para escaneo de comprobantes)
- **dolarapi.com** (Cotizaciones del dólar, sin API key)
- **date-fns** (Manejo de fechas)

## Características

### Transacciones
- Alta, edición y eliminación de transacciones (ingresos y gastos)
- Filtros por tipo, categoría y búsqueda por texto
- Paginación
- Sincronización en tiempo real con Supabase Realtime
- Importación desde Excel estándar (template descargable)
- Importación automática del resumen de tarjeta Visa (detecta el formato y parsea ARS y USD por separado)
- Importación desde extractos PDF de MercadoPago
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
- Navegación mes a mes con flechas `←` / `→` (`?month=yyyy-MM`)
- Resumen del mes: ingresos, gastos, balance y equivalente en USD
- Alertas de gasto: picos, categorías con alta participación y categorías nuevas
- Top categorías de gasto con desglose porcentual
- Widgets de cotización del dólar blue y oficial

### Tendencias e inflación
- Datos históricos de inflación por categoría
- Comparación de evolución del gasto en el tiempo

### Dólar
- Cotización en tiempo real de todos los tipos: oficial, blue, MEP, CCL, cripto
- Calculadora de cuántos dólares podés comprar según el superávit mensual

### Reportes
- Gráficos de barras, líneas y torta por categoría
- Filtros por período

### Autenticación
- Registro y login con Supabase Auth (email + contraseña)
- Sesión persistente con cookies SSR
- Logout desde el sidebar

### PWA (Progressive Web App)
- Instalable en el celular como app nativa (sin barra de URL)
- Funciona en modo standalone (pantalla completa)
- Compartí imágenes directamente desde el celu para escanear comprobantes

### Idioma
- Soporte completo en inglés y español — toggle en el sidebar, preferencia guardada en cookie

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

Ir al dashboard de Supabase > **SQL Editor** y crear las tablas con RLS activado:
`transactions`, `categories`, `recurring_transactions`, `goals`

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

Ver arquitectura completa en [`CLAUDE.md`](./CLAUDE.md#arquitectura).

Cada componente de sección tiene un `*.styles.ts` con las clases Tailwind extraídas como constantes.

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
