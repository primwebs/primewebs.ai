-- PRIME WEBS AI: Supabase database foundation
-- Apply in Supabase SQL Editor. Never commit real keys or passwords.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user','owner','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_single_owner on public.profiles ((role)) where role = 'owner';

create or replace function public.is_primewebs_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'); $$;
revoke all on function public.is_primewebs_owner() from public;
grant execute on function public.is_primewebs_owner() to authenticated;

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 50 check (balance >= 0),
  unlimited boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '', email text, phone text, notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists customers_user_id_idx on public.customers(user_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  name text not null default 'Nyt projekt', status text not null default 'draft',
  domain text, plan text,
  site jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  future jsonb not null default '[]'::jsonb,
  chat jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_customer_id_idx on public.projects(customer_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null, kind text not null, description text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists credit_transactions_user_created_idx on public.credit_transactions(user_id, created_at desc);

-- Assign owner only from the authenticated email stored by Supabase Auth.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare assigned_role text;
begin
  assigned_role := case when lower(coalesce(new.email, '')) = 'primewebssupport@gmail.com' then 'owner' else 'user' end;
  insert into public.profiles (id, email, display_name, role)
  values (new.id, lower(coalesce(new.email, '')), coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), assigned_role)
  on conflict (id) do update set email = excluded.email, display_name = coalesce(excluded.display_name, public.profiles.display_name);
  insert into public.credit_accounts (user_id, balance, unlimited)
  values (new.id, 50, assigned_role = 'owner')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_primewebs on auth.users;
create trigger on_auth_user_created_primewebs after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.protect_profile_privileges()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Profile role cannot be changed by this account';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger before update on public.profiles
for each row execute procedure public.protect_profile_privileges();

-- Atomic credit spending; the owner bypasses deductions.
create or replace function public.spend_credits(p_amount integer, p_kind text, p_description text default '')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_account public.credit_accounts%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Credit amount must be positive'; end if;
  select * into v_account from public.credit_accounts where user_id = auth.uid() for update;
  if not found then raise exception 'Credit account not found'; end if;
  if v_account.unlimited then return jsonb_build_object('success', true, 'unlimited', true, 'balance', null); end if;
  if v_account.balance < p_amount then return jsonb_build_object('success', false, 'unlimited', false, 'balance', v_account.balance); end if;
  update public.credit_accounts set balance = balance - p_amount, updated_at = now()
  where user_id = auth.uid() returning * into v_account;
  insert into public.credit_transactions(user_id, amount, kind, description)
  values (auth.uid(), -p_amount, coalesce(p_kind, 'usage'), coalesce(p_description, ''));
  return jsonb_build_object('success', true, 'unlimited', false, 'balance', v_account.balance);
end;
$$;
revoke all on function public.spend_credits(integer, text, text) from public;
grant execute on function public.spend_credits(integer, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.user_settings enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists profiles_read_self_or_owner on public.profiles;
create policy profiles_read_self_or_owner on public.profiles for select to authenticated
using (id = auth.uid() or public.is_primewebs_owner());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() or public.is_primewebs_owner())
with check (id = auth.uid() or public.is_primewebs_owner());

drop policy if exists credits_read_self_or_owner on public.credit_accounts;
create policy credits_read_self_or_owner on public.credit_accounts for select to authenticated
using (user_id = auth.uid() or public.is_primewebs_owner());

drop policy if exists customers_owner_access on public.customers;
create policy customers_owner_access on public.customers for all to authenticated
using (user_id = auth.uid() or public.is_primewebs_owner())
with check (user_id = auth.uid() or public.is_primewebs_owner());

drop policy if exists projects_owner_access on public.projects;
create policy projects_owner_access on public.projects for all to authenticated
using (user_id = auth.uid() or public.is_primewebs_owner())
with check (user_id = auth.uid() or public.is_primewebs_owner());

drop policy if exists settings_owner_access on public.user_settings;
create policy settings_owner_access on public.user_settings for all to authenticated
using (user_id = auth.uid() or public.is_primewebs_owner())
with check (user_id = auth.uid() or public.is_primewebs_owner());

drop policy if exists transactions_read_self_or_owner on public.credit_transactions;
create policy transactions_read_self_or_owner on public.credit_transactions for select to authenticated
using (user_id = auth.uid() or public.is_primewebs_owner());

revoke insert, update, delete on public.credit_accounts from anon, authenticated;
revoke insert, update, delete on public.credit_transactions from anon, authenticated;
