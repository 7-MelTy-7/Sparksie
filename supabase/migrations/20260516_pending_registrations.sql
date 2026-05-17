-- Ожидающие регистрации: проверяются edge-функциями до создания строки в auth.users.
-- Публичных политик нет — только service role / edge functions.

create extension if not exists pgcrypto;

create table if not exists public.pending_registrations (
  email text primary key,
  password_hash text not null,
  username text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pending_registrations_expires_idx
  on public.pending_registrations (expires_at);

create table if not exists public.registration_rate_limits (
  bucket_key text primary key,
  hit_count int not null default 1,
  window_start timestamptz not null default now()
);

alter table public.pending_registrations enable row level security;
alter table public.registration_rate_limits enable row level security;

-- Явный запрет для anon/authenticated (edge работает с service role)
revoke all on public.pending_registrations from anon, authenticated;
revoke all on public.registration_rate_limits from anon, authenticated;
