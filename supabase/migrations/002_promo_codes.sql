-- Promo codes (discount codes). Safe to run more than once.
-- Run this in Supabase → SQL Editor if your database was created from an older schema.sql.
-- (A fresh install of the current schema.sql already includes everything below.)

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
