# Base de datos — GastosApp

Hospedada en **Supabase** (PostgreSQL). Dos tablas principales con Row Level Security activado: cada usuario solo ve y modifica sus propios datos.

---

## Tablas

### `categories`

Categorías de transacciones creadas por cada usuario.

| Columna      | Tipo          | Descripción                              |
|--------------|---------------|------------------------------------------|
| `id`         | uuid (PK)     | Generado automáticamente                 |
| `user_id`    | uuid (FK)     | Referencia a `auth.users` — propietario  |
| `name`       | text          | Nombre de la categoría                   |
| `color`      | text          | Color en hex (default `#10b981`)         |
| `type`       | text          | `'ingreso'` o `'gasto'`                  |
| `created_at` | timestamptz   | Fecha de creación                        |

---

### `transactions`

Movimientos de dinero de cada usuario.

| Columna       | Tipo           | Descripción                                      |
|---------------|----------------|--------------------------------------------------|
| `id`          | uuid (PK)      | Generado automáticamente                         |
| `user_id`     | uuid (FK)      | Referencia a `auth.users` — propietario          |
| `category_id` | uuid (FK, opt) | Referencia a `categories` — puede ser null       |
| `amount`      | decimal(12,2)  | Monto positivo                                   |
| `description` | text           | Descripción libre                                |
| `date`        | date           | Fecha del movimiento (default: hoy)              |
| `type`        | text           | `'ingreso'` o `'gasto'`                          |
| `created_at`  | timestamptz    | Fecha de creación del registro                   |

---

## Seguridad

- **Row Level Security (RLS)** activado en ambas tablas.
- Cada tabla tiene 4 policies (SELECT, INSERT, UPDATE, DELETE) que limitan el acceso a `auth.uid() = user_id`.
- La autenticación es manejada por Supabase Auth (email + password).

## Índices

```
idx_transactions_user_id   → transactions(user_id)
idx_transactions_date      → transactions(date DESC)
idx_transactions_type      → transactions(type)
idx_categories_user_id     → categories(user_id)
```

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Ambas se obtienen en **Supabase Dashboard → Settings → API**.
