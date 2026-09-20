-- Additive policy for immutable Sellpia carrier uploads.
-- Existing Smartstore/Makeshop/Ably policies and stored objects are unchanged.
-- Rollback: drop policy if exists "sellpia originals insertable" on storage.objects;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sellpia originals insertable'
  ) then
    create policy "sellpia originals insertable"
      on storage.objects
      for insert
      to anon, authenticated
      with check (
        bucket_id = 'seller-originals'
        and (storage.foldername(name))[1] = 'sellpia'
      );
  end if;
end
$$;
