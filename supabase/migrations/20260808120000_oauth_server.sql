-- OAuth 2.1 authorization server for the Atom MCP endpoint.
--
-- These tables back /api/oauth/* and /api/mcp: they let a third-party MCP
-- client (claude.ai custom connectors) register itself, walk a user through an
-- authorization-code + PKCE flow, and hold a bearer token scoped to that user.
--
-- This is the mirror image of oauth_connections. That table holds tokens Atom
-- obtained FROM another service (Notion), where Atom is the OAuth *client*.
-- These tables hold tokens Atom ISSUES for itself, where Atom is the OAuth
-- *authorization server*. Nothing here touches oauth_connections.
--
-- Secrets are never stored in the clear: authorization codes, access tokens,
-- and refresh tokens are all held as SHA-256 hashes, so a database leak does
-- not hand over usable credentials. Lookups hash the presented value and
-- match on that.
--
-- Run in: Supabase -> SQL Editor.

-- Registered MCP clients (RFC 7591 dynamic client registration).
-- Rows are created by /api/oauth/register when a client enrols itself; there is
-- no manual provisioning step.
create table if not exists oauth_clients (
  client_id                   text primary key,
  client_name                 text,
  redirect_uris               text[] not null,
  grant_types                 text[] not null default array['authorization_code', 'refresh_token'],
  response_types              text[] not null default array['code'],
  -- 'none' = public client. Claude authenticates with PKCE rather than a
  -- secret, so there is no client_secret to store for the expected caller.
  token_endpoint_auth_method  text   not null default 'none',
  scope                       text,
  client_uri                  text,
  logo_uri                    text,
  created_at                  timestamptz not null default now()
);

-- Short-lived authorization codes. Single use: consumed_at is stamped on first
-- redemption, and a second presentation of the same code revokes every token
-- issued to that client/user pair (OAuth 2.1 replay handling).
create table if not exists oauth_authorization_codes (
  code_hash             text primary key,
  client_id             text not null references oauth_clients (client_id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  redirect_uri          text not null,
  code_challenge        text not null,
  code_challenge_method text not null default 'S256',
  scope                 text,
  resource              text,
  expires_at            timestamptz not null,
  consumed_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists oauth_authorization_codes_expires_at_idx
  on oauth_authorization_codes (expires_at);

create table if not exists oauth_access_tokens (
  token_hash  text primary key,
  client_id   text not null references oauth_clients (client_id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  scope       text,
  resource    text,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists oauth_access_tokens_user_id_idx  on oauth_access_tokens (user_id);
create index if not exists oauth_access_tokens_client_id_idx on oauth_access_tokens (client_id);
create index if not exists oauth_access_tokens_expires_at_idx on oauth_access_tokens (expires_at);

-- Refresh tokens rotate: redeeming one revokes it and issues a replacement, so
-- a stolen refresh token stops working as soon as the legitimate client uses
-- its own copy.
create table if not exists oauth_refresh_tokens (
  token_hash        text primary key,
  access_token_hash text references oauth_access_tokens (token_hash) on delete set null,
  client_id         text not null references oauth_clients (client_id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  scope             text,
  resource          text,
  expires_at        timestamptz not null,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists oauth_refresh_tokens_user_id_idx   on oauth_refresh_tokens (user_id);
create index if not exists oauth_refresh_tokens_expires_at_idx on oauth_refresh_tokens (expires_at);

-- RLS: these tables are server-only. The API routes read them with the service
-- role, which bypasses RLS entirely. Enabling RLS with almost no permissive
-- policy means a leaked anon key cannot read tokens or forge a client.
--
-- The one exception is a user listing and revoking their own connections, so a
-- "Connected apps" settings screen can be built without a service-role call.
alter table oauth_clients             enable row level security;
alter table oauth_authorization_codes enable row level security;
alter table oauth_access_tokens       enable row level security;
alter table oauth_refresh_tokens      enable row level security;

-- drop policy if exists "self_select_oauth_access_tokens" on oauth_access_tokens;
create policy "self_select_oauth_access_tokens" on oauth_access_tokens
  for select to authenticated using (auth.uid() = user_id);

-- Revoke-only: the WITH CHECK keeps the row on the same user, so this cannot be
-- used to hand a token to someone else.
-- drop policy if exists "self_revoke_oauth_access_tokens" on oauth_access_tokens;
create policy "self_revoke_oauth_access_tokens" on oauth_access_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Expired rows are dead weight — nothing reads them, since every lookup filters
-- on expires_at. Call periodically (pg_cron, or a scheduled function).
create or replace function prune_expired_oauth_artifacts()
returns void
language sql
security definer
set search_path = public
as $$
  delete from oauth_authorization_codes where expires_at < now() - interval '1 day';
  delete from oauth_access_tokens        where expires_at < now() - interval '7 days';
  delete from oauth_refresh_tokens       where expires_at < now() - interval '7 days';
$$;
