-- PRIME WEBS AI tenant-safe published website snapshots.
create table if not exists public.published_sites (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null unique references public.projects(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 63),
 site jsonb not null default '{}'::jsonb,
 html text not null,
 status text not null default 'unpublished' check (status in ('published','unpublished')),
 version integer not null default 0 check (version >= 0),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists published_sites_status_slug_idx on public.published_sites(status,slug);
create table if not exists public.published_site_versions (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 version integer not null check (version > 0),
 site jsonb not null default '{}'::jsonb,
 html text not null,
 created_at timestamptz not null default now(),
 unique(project_id,version)
);
alter table public.published_sites enable row level security;
alter table public.published_site_versions enable row level security;
revoke all on public.published_sites from anon,authenticated;
revoke all on public.published_site_versions from anon,authenticated;
grant select on public.published_sites to anon;
grant select,insert,update,delete on public.published_sites to authenticated;
grant select,insert on public.published_site_versions to authenticated;
create policy "Public can read published site snapshots" on public.published_sites for select to anon,authenticated using(status='published');
create policy "Owners can read their published site snapshots" on public.published_sites for select to authenticated using(owner_id=(select auth.uid()));
create policy "Owners can publish their own projects" on public.published_sites for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "Owners can update their own published projects" on public.published_sites for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy "Owners can delete their own published projects" on public.published_sites for delete to authenticated using(owner_id=(select auth.uid()));
create policy "Owners can read their private publish history" on public.published_site_versions for select to authenticated using(owner_id=(select auth.uid()));
create policy "Owners can save their private publish history" on public.published_site_versions for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
