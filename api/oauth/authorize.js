import { handlePreflight, json, methodNotAllowed, oauthError, readBody } from '../_lib/http.js'
import { adminClient, resourceUrl } from '../_lib/supabase.js'
import {
  CODE_TTL_SECONDS,
  expiresAt,
  hashToken,
  normalizeScope,
  randomToken,
} from '../_lib/oauth.js'

/**
 * The machine half of the authorization step. The browser-facing half is the
 * React route at /oauth/authorize, which renders the consent screen; this route
 * describes the pending request to that screen (GET) and mints the code once
 * the user decides (POST).
 *
 * Splitting it this way means the consent screen reuses the app's existing
 * Supabase session and login flow instead of reimplementing sign-in, and the
 * code is minted server-side where the client and redirect_uri can be checked.
 */
export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (req.method === 'GET') return describe(req, res)
  if (req.method === 'POST') return decide(req, res)
  return methodNotAllowed(res, ['GET', 'POST', 'OPTIONS'])
}

/** Normalises for comparison — a trailing slash is not a different resource. */
function sameResource(a, b) {
  return String(a).replace(/\/+$/, '').toLowerCase() === String(b).replace(/\/+$/, '').toLowerCase()
}

async function loadClient(clientId) {
  const { data, error } = await adminClient()
    .from('oauth_clients')
    .select('client_id, client_name, client_uri, logo_uri, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Tells the consent screen who is asking. Unauthenticated on purpose: this
 * returns only the client's own registration details, which the client already
 * knows, and the screen needs it before the user has necessarily signed in.
 */
async function describe(req, res) {
  const { client_id: clientId, redirect_uri: redirectUri } = req.query ?? {}
  if (!clientId) return oauthError(res, 400, 'invalid_request', 'client_id is required')

  let client
  try {
    client = await loadClient(clientId)
  } catch (e) {
    return json(res, 500, { error: 'server_error', error_description: e.message })
  }
  if (!client) return oauthError(res, 400, 'invalid_client', 'unknown client_id')

  return json(res, 200, {
    client_id: client.client_id,
    client_name: client.client_name,
    client_uri: client.client_uri,
    logo_uri: client.logo_uri,
    redirect_uri_registered: redirectUri ? client.redirect_uris.includes(redirectUri) : null,
  })
}

async function decide(req, res) {
  const body = readBody(req)
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod = 'S256',
    state,
    scope,
    resource,
    decision,
  } = body

  if (!clientId || !redirectUri) {
    return oauthError(res, 400, 'invalid_request', 'client_id and redirect_uri are required')
  }

  let client
  try {
    client = await loadClient(clientId)
  } catch (e) {
    return json(res, 500, { error: 'server_error', error_description: e.message })
  }
  if (!client) return oauthError(res, 400, 'invalid_client', 'unknown client_id')

  // Exact match against registration. This is the check that stops an attacker
  // pointing a legitimate client_id at a redirect_uri they control, so it must
  // happen before anything is echoed back to that URI.
  if (!client.redirect_uris.includes(redirectUri)) {
    return oauthError(res, 400, 'invalid_request', 'redirect_uri does not match a registered URI')
  }

  // Only now is the redirect target trusted enough to send errors to.
  const redirectWith = params => {
    const url = new URL(redirectUri)
    for (const [key, value] of Object.entries(params)) {
      if (value != null) url.searchParams.set(key, value)
    }
    if (state != null) url.searchParams.set('state', state)
    return json(res, 200, { redirect_to: url.toString() })
  }

  if (decision === 'deny') {
    return redirectWith({ error: 'access_denied', error_description: 'User denied the request' })
  }

  if (codeChallengeMethod !== 'S256' || !codeChallenge) {
    return redirectWith({
      error: 'invalid_request',
      error_description: 'code_challenge with code_challenge_method=S256 is required',
    })
  }

  if (resource && !sameResource(resource, resourceUrl())) {
    return redirectWith({
      error: 'invalid_target',
      error_description: 'resource does not match this server',
    })
  }

  // Identify the approving user from the app session the consent page holds.
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')
  if (!match) return oauthError(res, 401, 'access_denied', 'Not signed in to Atom')

  const admin = adminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(match[1])
  if (userError || !userData?.user) {
    return oauthError(res, 401, 'access_denied', 'Atom session is invalid or expired')
  }

  const code = randomToken()
  const { error: insertError } = await admin.from('oauth_authorization_codes').insert({
    code_hash: hashToken(code),
    client_id: clientId,
    user_id: userData.user.id,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: normalizeScope(scope),
    resource: resource ?? resourceUrl(),
    expires_at: expiresAt(CODE_TTL_SECONDS),
  })
  if (insertError) {
    return json(res, 500, { error: 'server_error', error_description: insertError.message })
  }

  return redirectWith({ code })
}
