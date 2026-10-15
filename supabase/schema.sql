-- ============================================================================
-- Admmis Store — database schema for Supabase (Postgres)
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
-- It is safe to read top to bottom; every table has Row Level Security (RLS).
-- ============================================================================

-- ─── Profiles (one row per signed-up user) ──────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Catalogue ──────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name_en     text not null,
  name_ne     text not null,
  sort_order  int  not null default 0
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_en         text not null,
  name_ne         text,
  description_en  text,
  description_ne  text,
  price           int  not null check (price >= 0),          -- NPR, whole rupees
  compare_at_price int check (compare_at_price is null or compare_at_price >= 0),
  category_id     uuid references public.categories(id) on delete set null,
  images          text[] not null default '{}',
  is_active       boolean not null default true,
  is_featured     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active, created_at desc);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  size        text,
  color       text,
  stock       int  not null default 0 check (stock >= 0)
);
create unique index if not exists product_variants_unique_idx
  on public.product_variants (product_id, coalesce(size, ''), coalesce(color, ''));

-- ─── Store settings (single row) ────────────────────────────────────────────
create table if not exists public.store_settings (
  id                  int primary key default 1 check (id = 1),
  shipping_fee        int not null default 150,       -- NPR
  free_shipping_over  int not null default 5000,      -- NPR subtotal
  cod_enabled         boolean not null default true,
  esewa_enabled       boolean not null default true
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- ─── Orders ─────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            bigint generated always as identity (start with 1001),
  user_id                 uuid not null references auth.users(id) on delete restrict,
  status                  text not null default 'pending'
                          check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_method          text not null check (payment_method in ('cod','esewa')),
  payment_status          text not null default 'unpaid'
                          check (payment_status in ('unpaid','paid','failed','refunded')),
  subtotal                int not null default 0,
  shipping_fee            int not null default 0,
  total                   int not null default 0,
  shipping_name           text not null,
  shipping_phone          text not null,
  shipping_address        text not null,
  shipping_city           text not null,
  shipping_district       text,
  notes                   text,
  esewa_transaction_uuid  text unique,
  esewa_ref_id            text,
  paid_at                 timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  variant_id  uuid references public.product_variants(id) on delete set null,
  name        text not null,
  size        text,
  color       text,
  unit_price  int not null,
  quantity    int not null check (quantity > 0),
  image       text
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.store_settings   enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- profiles: users read/update themselves (name + phone only), admins read all
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- A customer must never be able to promote themselves to admin:
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- categories: public read, admin write
drop policy if exists "categories read" on public.categories;
create policy "categories read" on public.categories for select using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- products: public sees active ones, admin sees and writes everything
drop policy if exists "products read" on public.products;
create policy "products read" on public.products for select
  using (is_active or public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "variants read" on public.product_variants;
create policy "variants read" on public.product_variants for select
  using (
    public.is_admin()
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );
drop policy if exists "variants admin write" on public.product_variants;
create policy "variants admin write" on public.product_variants for all
  using (public.is_admin()) with check (public.is_admin());

-- settings: public read, admin update
drop policy if exists "settings read" on public.store_settings;
create policy "settings read" on public.store_settings for select using (true);
drop policy if exists "settings admin update" on public.store_settings;
create policy "settings admin update" on public.store_settings for update
  using (public.is_admin()) with check (public.is_admin());

-- orders: customers read their own, admins read and update all.
-- Customers cannot insert/update directly: orders are created by place_order()
-- below so prices and stock are always calculated on the server.
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order items read" on public.order_items;
create policy "order items read" on public.order_items for select
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ─── Promo codes, order placement and cancel logic (also available as migrations/002_promo_codes.sql) ──
-- ─── Orders remember the discount ───────────────────────────────────────────
alter table public.orders add column if not exists discount   int  not null default 0;
alter table public.orders add column if not exists promo_code text;

-- ─── Promo codes ────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  kind          text not null check (kind in ('percent', 'fixed')),
  value         int  not null check (value > 0),
  min_subtotal  int  not null default 0 check (min_subtotal >= 0),
  max_uses      int  check (max_uses is null or max_uses > 0),
  uses          int  not null default 0,
  once_per_user boolean not null default true,
  starts_at     timestamptz,
  expires_at    timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (kind <> 'percent' or value <= 90)
);

alter table public.promo_codes enable row level security;
-- Customers cannot list codes (that would leak them). They test a code through preview_promo() below.
drop policy if exists "promo admin all" on public.promo_codes;
create policy "promo admin all" on public.promo_codes for all
  using (public.is_admin()) with check (public.is_admin());

-- Internal: decides whether a code applies to a subtotal for a user. Returns the discount or an error name.
create or replace function public.promo_check(p_code text, p_subtotal int, p_uid uuid)
returns table (discount int, code text, error text, min_subtotal int)
language plpgsql security definer set search_path = public as $$
declare
  v public.promo_codes;
  d int;
begin
  select * into v from public.promo_codes where promo_codes.code = upper(trim(coalesce(p_code, '')));
  if not found or not v.is_active then
    return query select 0, null::text, 'promo_invalid', 0; return;
  end if;
  if (v.starts_at is not null and v.starts_at > now()) or (v.expires_at is not null and v.expires_at <= now()) then
    return query select 0, v.code, 'promo_expired', 0; return;
  end if;
  if v.max_uses is not null and v.uses >= v.max_uses then
    return query select 0, v.code, 'promo_used_up', 0; return;
  end if;
  if v.once_per_user and p_uid is not null and exists (
    select 1 from public.orders o
     where o.user_id = p_uid and o.promo_code = v.code and o.status <> 'cancelled'
  ) then
    return query select 0, v.code, 'promo_already_used', 0; return;
  end if;
  if p_subtotal < v.min_subtotal then
    return query select 0, v.code, 'promo_min', v.min_subtotal; return;
  end if;

  if v.kind = 'percent' then
    d := floor(p_subtotal * v.value / 100.0)::int;
  else
    d := v.value;
  end if;
  d := least(d, p_subtotal);
  return query select d, v.code, null::text, 0;
end;
$$;
revoke all on function public.promo_check(text, int, uuid) from public, anon, authenticated;

-- What the checkout page calls to show "You save Rs. X" before the customer pays.
-- Prices come from the database, never from the browser.
create or replace function public.preview_promo(p_code text, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_subtotal int := 0;
  c          record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_cart');
  end if;

  select coalesce(sum(p.price * least(greatest(q.qty, 1), 20)), 0)::int into v_subtotal
    from (
      select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::int)::int as qty
        from jsonb_array_elements(p_items) e group by 1
    ) q
    join public.product_variants v on v.id = q.variant_id
    join public.products p on p.id = v.product_id and p.is_active;

  select * into c from public.promo_check(p_code, v_subtotal, v_uid);
  if c.error is not null then
    return jsonb_build_object('ok', false, 'error', c.error, 'min', c.min_subtotal);
  end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'discount', c.discount);
end;
$$;
revoke all on function public.preview_promo(text, jsonb) from public, anon;
grant execute on function public.preview_promo(text, jsonb) to authenticated;

-- ─── Place an order (server-side pricing + atomic stock decrement + optional promo) ──
drop function if exists public.place_order(jsonb, text, text, text, text, text, text, text);

create or replace function public.place_order(
  p_items          jsonb,
  p_name           text,
  p_phone          text,
  p_address        text,
  p_city           text,
  p_district       text,
  p_notes          text,
  p_payment_method text,
  p_promo          text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_settings   public.store_settings;
  v_order_id   uuid;
  v_order_no   bigint;
  v_subtotal   int := 0;
  v_discount   int := 0;
  v_promo      text := null;
  v_shipping   int := 0;
  v_total      int;
  r            record;
  v_var        record;
  c            record;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_payment_method not in ('cod', 'esewa') then
    raise exception 'invalid_payment_method';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = ''
     or coalesce(trim(p_address), '') = '' or coalesce(trim(p_city), '') = '' then
    raise exception 'invalid_shipping';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  select * into v_settings from public.store_settings where id = 1;
  if (p_payment_method = 'cod' and not v_settings.cod_enabled)
     or (p_payment_method = 'esewa' and not v_settings.esewa_enabled) then
    raise exception 'payment_method_disabled';
  end if;

  insert into public.orders (
    user_id, payment_method, shipping_name, shipping_phone, shipping_address,
    shipping_city, shipping_district, notes
  ) values (
    v_uid, p_payment_method, trim(p_name), trim(p_phone), trim(p_address),
    trim(p_city), nullif(trim(coalesce(p_district, '')), ''), nullif(trim(coalesce(p_notes, '')), '')
  ) returning id, order_number into v_order_id, v_order_no;

  for r in
    select (e ->> 'variant_id')::uuid as variant_id,
           sum((e ->> 'quantity')::int)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if r.qty < 1 or r.qty > 20 then
      raise exception 'invalid_quantity';
    end if;

    select v.id, v.size, v.color, v.stock,
           p.id as product_id, p.name_en, p.price, p.images
      into v_var
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = r.variant_id and p.is_active
       for update of v;

    if not found then
      raise exception 'item_unavailable';
    end if;
    if v_var.stock < r.qty then
      raise exception 'out_of_stock:%', v_var.name_en;
    end if;

    update public.product_variants set stock = stock - r.qty where id = v_var.id;

    insert into public.order_items (
      order_id, product_id, variant_id, name, size, color, unit_price, quantity, image
    ) values (
      v_order_id, v_var.product_id, v_var.id, v_var.name_en, v_var.size, v_var.color,
      v_var.price, r.qty, v_var.images[1]
    );

    v_subtotal := v_subtotal + v_var.price * r.qty;
  end loop;

  -- Promo code: lock the row so two simultaneous orders cannot both use the last redemption.
  if coalesce(trim(p_promo), '') <> '' then
    perform 1 from public.promo_codes where promo_codes.code = upper(trim(p_promo)) for update;
    select * into c from public.promo_check(p_promo, v_subtotal, v_uid);
    if c.error is not null then
      raise exception '%', c.error;
    end if;
    v_discount := c.discount;
    v_promo := c.code;
    update public.promo_codes set uses = uses + 1 where promo_codes.code = v_promo;
  end if;

  -- Free delivery is judged on the basket value before the discount.
  if v_subtotal >= v_settings.free_shipping_over then
    v_shipping := 0;
  else
    v_shipping := v_settings.shipping_fee;
  end if;
  v_total := v_subtotal - v_discount + v_shipping;

  update public.orders
     set subtotal = v_subtotal, discount = v_discount, promo_code = v_promo,
         shipping_fee = v_shipping, total = v_total
   where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_no,
    'total', v_total,
    'payment_method', p_payment_method
  );
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text, text, text, text) to authenticated;

-- ─── Cancelling an order returns its stock and its promo redemption ─────────
create or replace function public.restore_stock_on_cancel()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'cancelled_order_cannot_reopen';
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.product_variants v
       set stock = v.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id and oi.variant_id = v.id;
    if new.promo_code is not null then
      update public.promo_codes set uses = greatest(uses - 1, 0) where promo_codes.code = new.promo_code;
    end if;
  end if;
  return new;
end;
$$;

-- ─── Customer self-cancel (only unpaid, still-pending orders) ───────────────
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set status = 'cancelled'
   where id = p_order_id
     and user_id = auth.uid()
     and status = 'pending'
     and payment_status <> 'paid';
  if not found then
    raise exception 'cannot_cancel';
  end if;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;

-- ─── Put stock back whenever an order becomes cancelled ─────────────────────
-- A cancelled order can't be re-opened (its stock has already been released);
-- if the customer still wants the items, they place a new order.
-- (restore_stock_on_cancel() is defined with the promo-code block above.)
drop trigger if exists orders_restore_stock on public.orders;
create trigger orders_restore_stock after update of status on public.orders
  for each row execute function public.restore_stock_on_cancel();

-- ─── Storage bucket for product photos ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select
  using (bucket_id = 'product-images');
drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
