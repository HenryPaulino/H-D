create table public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date text,
  text text,
  image_url text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;

create policy "Public can read memories"
  on public.memories for select
  using (true);

create policy "Public can add memories"
  on public.memories for insert
  with check (true);

create policy "Public can delete memories"
  on public.memories for delete
  using (true);

insert into storage.buckets (id, name, public)
values ('memory-photos', 'memory-photos', true)
on conflict (id) do nothing;

create policy "Public can read memory photos"
  on storage.objects for select
  using (bucket_id = 'memory-photos');

create policy "Public can upload memory photos"
  on storage.objects for insert
  with check (bucket_id = 'memory-photos');

create policy "Public can delete memory photos"
  on storage.objects for delete
  using (bucket_id = 'memory-photos');

create table public.shared_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.shared_settings enable row level security;

create policy "Public can read shared settings"
  on public.shared_settings for select
  using (true);

create policy "Public can save shared settings"
  on public.shared_settings for insert
  with check (true);

create policy "Public can update shared settings"
  on public.shared_settings for update
  using (true)
  with check (true);

create table public.shared_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('place', 'date', 'church')),
  title text not null,
  date text,
  text text,
  created_at timestamptz not null default now()
);

alter table public.shared_entries enable row level security;

create policy "Public can read shared entries"
  on public.shared_entries for select
  using (true);

create policy "Public can add shared entries"
  on public.shared_entries for insert
  with check (true);

create policy "Public can delete shared entries"
  on public.shared_entries for delete
  using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.memories;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.shared_entries;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.shared_settings;
  exception when duplicate_object then null;
  end;
end $$;
