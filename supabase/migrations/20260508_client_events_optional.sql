-- Опциональное хранилище телеметрии событий фронтенда.
create table if not exists public.client_events (
  id bigint generated always as identity primary key,
  user_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.client_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'client_events'
      and policyname = 'client_events_insert_own'
  ) then
    create policy client_events_insert_own
      on public.client_events
      for insert
      to authenticated
      with check (user_id = auth.uid() or user_id is null);
  end if;
end $$;
