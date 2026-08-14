import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

// Two scopes, mapped to what the MCP tools do rather than to individual tables:
// a connector either reads CRM data or also writes to it.
export const SCOPES = ['crm:read', 'crm:write']
export const DEFAULT_SCOPE = 'crm:read'

export const CODE_TTL_SECONDS = 300 // OAuth 2.1 caps authorization codes at 10 min
export const ACCESS_TTL_SECONDS = 60 * 60
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30

function b64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomToken() {
  return b64url(randomBytes(32))
}

/**
 * Also the PKCE S256 transform — BASE64URL(SHA256(value)) is both how we hash
 * tokens at rest and how a code_challenge is derived from its verifier.
 */
export function hashToken(value) {
  return b64url(createHash('sha256').update(value, 'utf8').digest())
}

export function verifyPkceS256(verifier, challenge) {
  if (typeof verifier !== 'string' || typeof challenge !== 'string') return false
  const a = Buffer.from(hashToken(verifier))
  const b = Buffer.from(challenge)
  // timingSafeEqual throws on a length mismatch, which is itself a non-match.
  return a.length === b.length && timingSafeEqual(a, b)
}

export function expiresAt(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

/**
 * Narrows a requested scope string to what this server actually grants.
 * Unknown scopes are dropped rather than rejected — a client asking for more
 * than it can have still gets a working, lesser token, and the response tells
 * it what it received.
 */
export function normalizeScope(requested) {
  if (!requested) return DEFAULT_SCOPE
  const granted = String(requested)
    .split(/\s+/)
    .filter(s => SCOPES.includes(s))
  return granted.length ? [...new Set(granted)].join(' ') : DEFAULT_SCOPE
}

export function scopeAllows(scope, required) {
  return String(scope ?? '').split(/\s+/).includes(required)
}

/**
 * Redirect URIs must be exact-matched against registration, so they are
 * validated at registration time rather than trusted at authorize time.
 * Loopback is allowed unencrypted because a local client has no TLS to offer;
 * everything else must be https.
 */
export function isValidRedirectUri(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.hash) return false
  if (url.protocol === 'https:') return true
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
}

/**
 * Resolves a bearer token to the user it was issued for.
 *
 * Returns null for anything unusable — missing, malformed, unknown, revoked, or
 * expired — because the caller's response is identical in every one of those
 * cases and distinguishing them for the client would leak token state.
 */
export async function verifyAccessToken(admin, authorizationHeader) {
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? '')
  if (!match) return null

  const { data, error } = await admin
    .from('oauth_access_tokens')
    .select('token_hash, client_id, user_id, scope, expires_at, revoked_at')
    .eq('token_hash', hashToken(match[1]))
    .maybeSingle()

  if (error || !data) return null
  if (data.revoked_at) return null
  if (new Date(data.expires_at).getTime() <= Date.now()) return null

  return data
}

/**
 * Issues an access/refresh pair and records both. `authCodeHash` is carried on
 * the tokens so a replayed authorization code can revoke exactly what it
 * produced.
 */
export async function issueTokenPair(admin, { clientId, userId, scope, resource }) {
  const accessToken = randomToken()
  const refreshToken = randomToken()
  const accessHash = hashToken(accessToken)

  const { error: accessError } = await admin.from('oauth_access_tokens').insert({
    token_hash: accessHash,
    client_id: clientId,
    user_id: userId,
    scope,
    resource,
    expires_at: expiresAt(ACCESS_TTL_SECONDS),
  })
  if (accessError) throw new Error(accessError.message)

  const { error: refreshError } = await admin.from('oauth_refresh_tokens').insert({
    token_hash: hashToken(refreshToken),
    access_token_hash: accessHash,
    client_id: clientId,
    user_id: userId,
    scope,
    resource,
    expires_at: expiresAt(REFRESH_TTL_SECONDS),
  })
  if (refreshError) throw new Error(refreshError.message)

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
  }
}

/**
 * Blast radius for a replayed authorization code or refresh token: everything
 * that client currently holds for that user. Deliberately coarse — if a code
 * was replayed we cannot tell which party is the attacker, so both lose access
 * and the user reconnects.
 */
export async function revokeAllFor(admin, clientId, userId) {
  const now = new Date().toISOString()
  await admin
    .from('oauth_access_tokens')
    .update({ revoked_at: now })
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .is('revoked_at', null)
  await admin
    .from('oauth_refresh_tokens')
    .update({ revoked_at: now })
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .is('revoked_at', null)
}
