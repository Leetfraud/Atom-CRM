import { handlePreflight, jsonCached, methodNotAllowed, json } from '../_lib/http.js'
import { issuer } from '../_lib/supabase.js'
import { SCOPES } from '../_lib/oauth.js'

/**
 * Authorization server metadata (RFC 8414).
 *
 * Served at /.well-known/oauth-authorization-server via a rewrite in
 * vercel.json — the spec requires it at the domain root, which is why this
 * whole server lives on the app domain rather than under a Supabase Edge
 * Function path.
 *
 * `authorization_endpoint` deliberately points at the React route, not an API
 * route: that step is a browser redirect where the user signs in and consents,
 * so it has to render UI. Every other endpoint here is machine-to-machine.
 */
export default function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET', 'OPTIONS'])

  let base
  try {
    base = issuer()
  } catch (e) {
    return json(res, 500, { error: 'server_error', error_description: e.message })
  }

  jsonCached(res, {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    scopes_supported: SCOPES,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    // S256 only. OAuth 2.1 removes "plain", and advertising it would let a
    // client downgrade to a challenge that provides no protection.
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    service_documentation: `${base}/`,
  })
}
