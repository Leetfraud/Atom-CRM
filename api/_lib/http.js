// Shared response helpers for the OAuth + MCP routes.
//
// CORS is wide open on these endpoints by design: the discovery documents and
// the token endpoint are meant to be fetched by arbitrary MCP clients, and the
// spec expects them to be reachable cross-origin. Nothing here is authorised by
// origin — every protected route checks a bearer token instead.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-protocol-version, mcp-session-id, last-event-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  // WWW-Authenticate carries the discovery pointer on a 401; a browser-based
  // client cannot follow it unless the header is explicitly exposed.
  'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
}

export function applyCors(res) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value)
}

/** Answers a CORS preflight. Returns true when the request was fully handled. */
export function handlePreflight(req, res) {
  applyCors(res)
  if (req.method !== 'OPTIONS') return false
  res.status(204).end()
  return true
}

export function json(res, status, body, extraHeaders = {}) {
  applyCors(res)
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value)
  res.setHeader('Content-Type', 'application/json')
  res.status(status).send(JSON.stringify(body))
}

/** Discovery documents are static per deployment and safe to cache publicly. */
export function jsonCached(res, body, seconds = 3600) {
  json(res, 200, body, { 'Cache-Control': `public, max-age=${seconds}` })
}

/** RFC 6749 §5.2 error shape — the form OAuth clients actually parse. */
export function oauthError(res, status, error, description) {
  json(res, status, { error, ...(description ? { error_description: description } : {}) })
}

export function methodNotAllowed(res, allowed) {
  json(res, 405, { error: 'method_not_allowed' }, { Allow: allowed.join(', ') })
}

/**
 * Vercel parses JSON bodies automatically, but the token endpoint is also
 * required to accept form encoding — and a client that sends no content-type
 * leaves `req.body` as a raw string. Normalise all three into an object.
 */
export function readBody(req) {
  const body = req.body
  if (!body) return {}
  if (typeof body === 'object' && !Buffer.isBuffer(body)) return body

  const raw = Buffer.isBuffer(body) ? body.toString('utf8') : String(body)
  if (!raw.trim()) return {}

  const contentType = req.headers['content-type'] ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw))
  }
  try {
    return JSON.parse(raw)
  } catch {
    return Object.fromEntries(new URLSearchParams(raw))
  }
}
