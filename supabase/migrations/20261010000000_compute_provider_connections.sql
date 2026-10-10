-- Compute provider connections (hyperscalers, NVIDIA, GPU clouds, inference APIs).
-- Secrets live in Supabase Vault; this table only stores a vault reference.
-- The browser can read non-secret columns of its own rows; all writes go
-- through the provider-connect edge function (service role).

create extension if not exists supabase_vault with schema vault;

create table if not exists public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null check (char_length(provider_id) <= 64),
  auth_method text not null check (char_length(auth_method) <= 64),
  label text not null check (char_length(label) between 1 and 120),
  account_ref jsonb not null default '{}'::jsonb,
  identity text,                       -- e.g. AWS account ARN, GCP SA email, Azure sub name
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'awaiting_gateway', 'error', 'revoked')),
  status_message text,
  validation_mode text not null check (validation_mode in ('direct', 'gateway')),
  launch_enabled boolean not null default false,
  secret_id uuid,                      -- vault.secrets.id, never exposed to clients
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider_id, label)
);

create index if not exists provider_connections_user_idx on public.provider_connections (user_id);

alter table public.provider_connections enable row level security;

drop policy if exists "Users read own provider connections" on public.provider_connections;
create policy "Users read own provider connections"
  on public.provider_connections for select to authenticated
  using (auth.uid() = user_id);

-- Column-level grant: secret_id is not selectable by clients.
revoke all on public.provider_connections from anon, authenticated;
grant select (id, user_id, provider_id, auth_method, label, account_ref, identity, status,
              status_message, validation_mode, launch_enabled, last_validated_at, created_at, updated_at)
  on public.provider_connections to authenticated;

-- Append-only audit trail (connect / test / inventory / disconnect).
create table if not exists public.provider_events (
  id bigint generated always as identity primary key,
  connection_id uuid references public.provider_connections(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  action text not null check (action in ('connect', 'test', 'inventory', 'disconnect')),
  ok boolean not null,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists provider_events_user_idx on public.provider_events (user_id, created_at desc);
alter table public.provider_events enable row level security;

drop policy if exists "Users read own provider events" on public.provider_events;
create policy "Users read own provider events"
  on public.provider_events for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.provider_events from anon, authenticated;
grant select on public.provider_events to authenticated;

-- Vault helpers, callable only by the service role (edge functions).
create or replace function public.provider_secret_put(p_secret text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return vault.create_secret(p_secret, p_name, 'LightOS compute provider credential');
end;
$$;

create or replace function public.provider_secret_get(p_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_id;
$$;

create or replace function public.provider_secret_delete(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from vault.secrets where id = p_id;
$$;

revoke all on function public.provider_secret_put(text, text) from public, anon, authenticated;
revoke all on function public.provider_secret_get(uuid) from public, anon, authenticated;
revoke all on function public.provider_secret_delete(uuid) from public, anon, authenticated;
grant execute on function public.provider_secret_put(text, text) to service_role;
grant execute on function public.provider_secret_get(uuid) to service_role;
grant execute on function public.provider_secret_delete(uuid) to service_role;

create or replace function public.touch_provider_connections()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists provider_connections_touch on public.provider_connections;
create trigger provider_connections_touch
  before update on public.provider_connections
  for each row execute function public.touch_provider_connections();
