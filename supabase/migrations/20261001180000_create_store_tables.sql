-- Store tables. The API uses the secret key (service role), which bypasses RLS.
-- No policies: the publishable key cannot read orders, earnings, or PIN hashes.

create table public.products (
  id integer primary key,
  name text not null,
  meta text not null default '',
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  was numeric(10,2) check (was is null or was >= 0),
  shape text not null,
  color text not null,
  cap text not null,
  popularity integer not null default 0,
  info jsonb not null default '[]'::jsonb,
  green boolean not null default false,
  is_new boolean not null default false,
  image text,
  active boolean not null default true
);

create table public.coupons (
  code text primary key,
  name text not null,
  discount numeric(5,2) not null check (discount >= 0 and discount <= 50),
  commission numeric(5,2) not null check (commission >= 0 and commission <= 50),
  active boolean not null default true,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'processing', 'shipped', 'cancelled')),
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric(12,2) not null,
  bundle_discount numeric(12,2) not null default 0,
  coupon_code text,
  coupon_discount numeric(12,2) not null default 0,
  net numeric(12,2) not null,
  shipping numeric(12,2) not null,
  total numeric(12,2) not null
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create table public.earnings (
  id uuid primary key,
  order_id uuid not null references public.orders (id) on delete restrict,
  order_number text not null,
  code text not null,
  created_at timestamptz not null default now(),
  sale numeric(12,2) not null,
  rate numeric(5,2) not null,
  commission numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz
);

create index earnings_order_id_idx on public.earnings (order_id);
create index earnings_code_status_idx on public.earnings (code, status);

alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.earnings enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.coupons from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.earnings from anon, authenticated;
