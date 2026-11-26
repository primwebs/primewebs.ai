-- Public read for website assets; writes are restricted to the owner's user folder.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'primewebs-media',
  'primewebs-media',
  true,
  20971520,
  array['image/jpeg','image/png','image/webp','image/gif',''model/gltf-binary','model/gltf+json','application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read PrimeWebs media" on storage.objects;
create policy "Public read PrimeWebs media" on storage.objects
for select to anon, authenticated
using (bucket_id = 'primewebs-media');

drop policy if exists "Upload own PrimeWebs media" on storage.objects;
create policy "Upload own PrimeWebs media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'primewebs-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_primewebs_owner())
  )
);

drop policy if exists "Update own PrimeWebs media" on storage.objects;
create policy "Update own PrimeWebs media" on storage.objects
for update to authenticated
using (
  bucket_id = 'primewebs-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_primewebs_owner())
  )
)
with check (
  bucket_id = 'primewebs-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_primewebs_owner())
  )
);

drop policy if exists "Delete own PrimeWebs media" on storage.objects;
create policy "Delete own PrimeWebs media" on storage.objects
for delete to authenticated
using (
  bucket_id = 'primewebs-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_primewebs_owner())
  )
);
