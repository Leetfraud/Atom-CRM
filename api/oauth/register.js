import { handlePreflight, json, methodNotAllowed, oauthError, readBody } from '../_lib/http.js'
import { adminClient } from '../_lib/supabase.js'
import { DEFAULT_SCOPE, isValidRedirectUri, normalizeScope, randomToken } from '../_lib/oauth.js'

const MAX_REDIRECT_URIS = 10

/**
 * Dynamic client registration (RFC 7591).
 *
 * Open registration: any caller can enrol and receive a client_id. That is the
 * point — claude.ai registers itself the first time a user adds the connector,
 * with no manual provisioning on your side. A client_id alone grants nothing:
 * it cannot mint a token without a user completing the consent screen, and PKCE
 * binds the resulting code to the client that started the flow.
 *
 * The one thing worth guarding is redirect_uris, since those are where codes
 * get delivered. They are validated here and exact-matched at authorize time.
 */
export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST', 'OPTIONS'])

  const body = readBody(req)
  const redirectUris = body.redirect_uris

  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthError(res, 400, 'invalid_redirect_uri', 'redirect_uris is required')
  }
  if (redirectUris.length > MAX_REDIRECT_URIS) {
    return oauthError(res, 400, 'invalid_redirect_uri', `at most ${MAX_REDIRECT_URIS} redirect_uris`)
  }
  for (const uri of redirectUris) {
    if (typeof uri !== 'string' || !isValidRedirectUri(uri)) {
      return oauthError(
        res,
        400,
        'invalid_redirect_uri',
        `redirect_uri must be https (or http on localhost) with no fragment: ${uri}`,
      )
    }
  }

  // Only the public-client flow is supported, so reject a client asking to
  // authenticate with a secret rather than silently registering it as public
  // and failing later at the token endpoint.
  const authMethod = body.token_endpoint_auth_method ?? 'none'
  if (authMethod !== 'none') {
    return oauthError(
      res,
      400,
      'invalid_client_metadata',
      'only token_endpoint_auth_method "none" (public client + PKCE) is supported',
    )
  }

  const clientId = `atom-${randomToken()}`
  const scope = body.scope ? normalizeScope(body.scope) : DEFAULT_SCOPE

  const record = {
    client_id: clientId,
    client_name: typeof body.client_name === 'string' ? body.client_name.slice(0, 200) : null,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope,
    client_uri: typeof body.client_uri === 'string' ? body.client_uri : null,
    logo_uri: typeof body.logo_uri === 'string' ? body.logo_uri : null,
  }

  try {
    const { error } = await adminClient().from('oauth_clients').insert(record)
    if (error) throw new Error(error.message)
  } catch (e) {
    return json(res, 500, { error: 'server_error', error_description: e.message })
  }

  // client_id_issued_at is seconds since epoch per the RFC. No secret and no
  // expiry: public clients re-register rather than rotate.
  return json(res, 201, {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: record.client_name,
    redirect_uris: record.redirect_uris,
    grant_types: record.grant_types,
    response_types: record.response_types,
    token_endpoint_auth_method: 'none',
    scope,
  })
}
