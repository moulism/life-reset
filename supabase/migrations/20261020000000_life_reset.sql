-- Life Reset – kompletní schéma (idempotentní, dá se spustit znovu).
-- Jedna tabulka pro všechna data aplikace: každý řádek = jedna položka (úkol, událost, jídlo, …).

create table if not exists public.lr_items (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  col         text not null,                       -- kolekce: tasks, events, meals, …
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),  -- čas změny v zařízení (rozhoduje konflikty)
  deleted     boolean not null default false,      -- smazání se synchronizuje jako "tombstone"
  synced_at   timestamptz not null default now()   -- čas zápisu na server (podle něj se stahuje)
);

alter table public.lr_items add column if not exists synced_at timestamptz not null default now();

create index if not exists lr_items_user_updated_idx on public.lr_items (user_id, updated_at);
create index if not exists lr_items_user_synced_idx on public.lr_items (user_id, synced_at);

-- Server nastaví synced_at a nepustí starší verzi přes novější (zařízení offline se starými daty).
create or replace function public.lr_items_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      old.synced_at := clock_timestamp();  -- novější verze na serveru vyhrává
      return old;                          -- a zařízení si ji při dalším stažení vezme
    end if;
    new.user_id := old.user_id;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists lr_items_guard on public.lr_items;
create trigger lr_items_guard
  before insert or update on public.lr_items
  for each row execute function public.lr_items_guard();

-- RLS: každý vidí a mění jen své řádky
alter table public.lr_items enable row level security;

drop policy if exists lr_items_select_own on public.lr_items;
drop policy if exists lr_items_insert_own on public.lr_items;
drop policy if exists lr_items_update_own on public.lr_items;
drop policy if exists lr_items_delete_own on public.lr_items;
create policy lr_items_select_own on public.lr_items for select to authenticated using (user_id = (select auth.uid()));
create policy lr_items_insert_own on public.lr_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy lr_items_update_own on public.lr_items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy lr_items_delete_own on public.lr_items for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.lr_items from anon;
revoke truncate, references, trigger on public.lr_items from authenticated;
grant select, insert, update, delete on public.lr_items to authenticated;

-- Soubory (školní dokumenty, smlouvy, …): soukromý bucket, složka = id uživatele
insert into storage.buckets (id, name, public, file_size_limit)
values ('lr-files', 'lr-files', false, 52428800)
on conflict (id) do nothing;

drop policy if exists lr_files_select_own on storage.objects;
drop policy if exists lr_files_insert_own on storage.objects;
drop policy if exists lr_files_update_own on storage.objects;
drop policy if exists lr_files_delete_own on storage.objects;
create policy lr_files_select_own on storage.objects for select to authenticated
  using (bucket_id = 'lr-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy lr_files_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'lr-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy lr_files_update_own on storage.objects for update to authenticated
  using (bucket_id = 'lr-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy lr_files_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'lr-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
