-- Keep the existing row ownership rules, but cache auth helpers once per statement.
-- This follows Supabase's RLS performance guidance and does not broaden access.

drop policy if exists "profiles_read_self_or_owner" on public.profiles;
create policy "profiles_read_self_or_owner" on public.profiles
for select to authenticated
using ((id = (select auth.uid())) or (select public.is_primewebs_owner()));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated
using ((id = (select auth.uid())) or (select public.is_primewebs_owner()))
with check ((id = (select auth.uid())) or (select public.is_primewebs_owner()));

drop policy if exists "credits_read_self_or_owner" on public.credit_accounts;
create policy "credits_read_self_or_owner" on public.credit_accounts
for select to authenticated
using ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()));

drop policy if exists "transactions_read_self_or_owner" on public.credit_transactions;
create policy "transactions_read_self_or_owner" on public.credit_transactions
for select to authenticated
using ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()));

drop policy if exists "customers_owner_access" on public.customers;
create policy "customers_owner_access" on public.customers
for all to authenticated
using ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()))
with check ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()));

drop policy if exists "projects_owner_access" on public.projects;
create policy "projects_owner_access" on public.projects
for all to authenticated
using ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()))
with check ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()));

drop policy if exists "settings_owner_access" on public.user_settings;
create policy "settings_owner_access" on public.user_settings
for all to authenticated
using ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()))
with check ((user_id = (select auth.uid())) or (select public.is_primewebs_owner()));

drop policy if exists "Owners read their booking requests" on public.booking_requests;
create policy "Owners read their booking requests" on public.booking_requests
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Owners update their booking requests" on public.booking_requests;
create policy "Owners update their booking requests" on public.booking_requests
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
