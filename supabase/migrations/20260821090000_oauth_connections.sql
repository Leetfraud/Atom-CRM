-- Tokens Atom holds FOR another service, where Atom is the OAuth *client*.
--
-- This is the mirror image of 20260808120000_oauth_server.sql: that file backs
-- the tokens Atom issues for itself. Nothing here touches those tables.
--
-- oauth-callback writes rows; _shared/token.ts reads them and rewrites the pair
-- when a refresh rotates it. Both run with the service role. The browser only
-- ever reaches this table through the two functions at the bottom, so an access
-- token never crosses the network to a client.
--
-- Written to be safe to re-run: the table already exists in projects that were
-- set up by hand before this migration was added.
--
-- Run in: Supabase -> SQL Editor.

create table if not exists oauth_connections (
  user_id       uuid        not null references auth.users (id) on delete cascade,
  provider      text        not null,
  access_token  text        not null,
  -- Notion issues one only for workspaces that enable token rotation; without
  -- it an expired token means the user has to reconnect.
  refresh_token text,
  -- Null means "does not expire" — token.ts treats that as always fresh.
  expires_at    timestamptz,
  scopes        text,
  -- workspace_id / workspace_name / bot_id, so a future settings screen can say
  -- *which* Notion workspace is connected.
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, provider)
);

create index if not exists oauth_connections_user_id_idx on oauth_connections (user_id);

-- RLS with no permissive policy at all: the service role bypasses it, and every
-- legitimate reader is service-role. A leaked anon key reads nothing.
alter table oauth_connections enable row level security;

-- Which providers am I connected to? Deliberately returns no token material —
-- just enough to render a "Connected / Disconnect" row.
create or replace function get_connected_providers()
returns table (
  provider       text,
  connected_at   timestamptz,
  updated_at     timestamptz,
  expires_at     timestamptz,
  workspace_name text
)
language sql
security definer
set search_path = public
as $$
  select
    c.provider,
    c.created_at,
    c.updated_at,
    c.expires_at,
    c.metadata ->> 'workspace_name'
  from oauth_connections c
  where c.user_id = auth.uid()
  order by c.provider;
$$;

-- Drop the stored token for one provider. Scoped to auth.uid(), so a caller
-- cannot disconnect anybody else however they invoke it.
create or replace function disconnect_provider(p_provider text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from oauth_connections
  where user_id = auth.uid() and provider = p_provider;

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- security definer functions are executable by PUBLIC by default; narrow them
-- to signed-in callers so the anon role cannot probe them.
revoke all on function get_connected_providers() from public;
revoke all on function disconnect_provider(text) from public;
grant execute on function get_connected_providers() to authenticated;
grant execute on function disconnect_provider(text) to authenticated;
