import { createClient } from '@supabase/supabase-js'

let cached = null

/**
 * Service-role client. Every OAuth table is RLS-locked with almost no
 * permissive policy, so the API routes are the only thing that can read them —
 * and this key must never be exposed to the browser bundle. It is read from
 * SUPABASE_SERVICE_ROLE_KEY (no VITE_ prefix) precisely so Vite cannot inline
 * it into client code.
 */
export function adminClient() {
  if (cached) return cached

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('SUPABASE_URL is not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

/**
 * The public origin this deployment is reachable at — the OAuth `issuer`.
 *
 * It has to be configured rather than derived from the request Host header:
 * every discovery document embeds absolute URLs, and a client that receives an
 * issuer differing from the one it discovered rejects the metadata. Vercel
 * gives each deployment its own preview hostname, so trusting Host would make
 * the issuer change per deploy.
 */
export function issuer() {
  const raw = process.env.OAUTH_ISSUER
  if (!raw) throw new Error('OAUTH_ISSUER is not set (e.g. https://atom.example.com)')
  return raw.replace(/\/+$/, '')
}

/** Canonical identifier of the protected resource, per RFC 8707. */
export function resourceUrl() {
  return `${issuer()}/api/mcp`
}
