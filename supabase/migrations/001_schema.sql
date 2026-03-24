-- =============================================
-- GastosApp - Schema inicial
-- =============================================

-- Tabla de categorías
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#10b981',
  type text not null check (type in ('ingreso', 'gasto')),
  created_at timestamptz default now()
);

-- Tabla de transacciones
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  amount decimal(12,2) not null check (amount > 0),
  description text,
  date date not null default current_date,
  type text not null check (type in ('ingreso', 'gasto')),
  created_at timestamptz default now()
);

-- Índices para mejor performance
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_date on transactions(date desc);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_categories_user_id on categories(user_id);

-- Row Level Security
alter table categories enable row level security;
alter table transactions enable row level security;

-- Policies para categories
create policy "Users can view their own categories"
  on categories for select
  using (auth.uid() = user_id);

create policy "Users can insert their own categories"
  on categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own categories"
  on categories for update
  using (auth.uid() = user_id);

create policy "Users can delete their own categories"
  on categories for delete
  using (auth.uid() = user_id);

-- Policies para transactions
create policy "Users can view their own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- Habilitar Realtime para ambas tablas
-- Ejecutar en Supabase Dashboard > Database > Replication
-- O con:
-- alter publication supabase_realtime add table transactions;
-- alter publication supabase_realtime add table categories;
