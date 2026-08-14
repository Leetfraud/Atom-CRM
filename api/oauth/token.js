import { handlePreflight, json, methodNotAllowed, oauthError, readBody } from '../_lib/http.js'
import { adminClient } from '../_lib/supabase.js'
import { hashToken, issueTokenPair, revokeAllFor, verifyPkceS256 } from '../_lib/oauth.js'

/**
 * Token endpoint. Two grants: authorization_code (first exchange) and
 * refresh_token (rotation thereafter).
 *
 * Responses must not be cached — they carry credentials.
 */
export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST', 'OPTIONS'])

  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')

  const body = readBody(req)
  try {
    if (body.grant_type === 'authorization_code') return await authorizationCodeGrant(res, body)
    if (body.grant_type === 'refresh_token') return await refreshTokenGrant(res, body)
    return oauthError(res, 400, 'unsupported_grant_type', `unsupported grant_type: ${body.grant_type}`)
  } catch (e) {
    return json(res, 500, { error: 'server_error', error_description: e.message })
  }
}

async function authorizationCodeGrant(res, body) {
  const {
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  } = body

  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return oauthError(
      res,
      400,
      'invalid_request',
      'code, client_id, redirect_uri and code_verifier are required',
    )
  }

  const admin = adminClient()
  const { data: record, error } = await admin
    .from('oauth_authorization_codes')
    .select('*')
    .eq('code_hash', hashToken(code))
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!record) return oauthError(res, 400, 'invalid_grant', 'Unknown or expired authorization code')

  // Replay. The code already bought a token, so either the client is retrying
  // after a leak or an attacker got hold of it — we cannot tell which, so
  // everything this client holds for this user is revoked and the user
  // reconnects. (OAuth 2.1 §4.1.3.)
  if (record.consumed_at) {
    await revokeAllFor(admin, record.client_id, record.user_id)
    return oauthError(res, 400, 'invalid_grant', 'Authorization code has already been used')
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return oauthError(res, 400, 'invalid_grant', 'Authorization code has expired')
  }
  if (record.client_id !== clientId) {
    return oauthError(res, 400, 'invalid_grant', 'Authorization code was issued to another client')
  }
  if (record.redirect_uri !== redirectUri) {
    return oauthError(res, 400, 'invalid_grant', 'redirect_uri does not match the authorization request')
  }
  if (!verifyPkceS256(codeVerifier, record.code_challenge)) {
    return oauthError(res, 400, 'invalid_grant', 'PKCE verification failed')
  }

  // Consume before issuing, and make the update itself the race guard: the
  // `is('consumed_at', null)` filter means two simultaneous redemptions cannot
  // both match, so only one of them proceeds to mint a token.
  const { data: consumed, error: consumeError } = await admin
    .from('oauth_authorization_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('code_hash', record.code_hash)
    .is('consumed_at', null)
    .select('code_hash')

  if (consumeError) throw new Error(consumeError.message)
  if (!consumed || consumed.length === 0) {
    await revokeAllFor(admin, record.client_id, record.user_id)
    return oauthError(res, 400, 'invalid_grant', 'Authorization code has already been used')
  }

  const tokens = await issueTokenPair(admin, {
    clientId: record.client_id,
    userId: record.user_id,
    scope: record.scope,
    resource: record.resource,
  })
  return json(res, 200, tokens)
}

async function refreshTokenGrant(res, body) {
  const { refresh_token: refreshToken, client_id: clientId, scope: requestedScope } = body
  if (!refreshToken || !clientId) {
    return oauthError(res, 400, 'invalid_request', 'refresh_token and client_id are required')
  }

  const admin = adminClient()
  const { data: record, error } = await admin
    .from('oauth_refresh_tokens')
    .select('*')
    .eq('token_hash', hashToken(refreshToken))
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!record) return oauthError(res, 400, 'invalid_grant', 'Unknown refresh token')

  // Rotation means a valid refresh token is used exactly once. Seeing a revoked
  // one again is the same ambiguous signal as a replayed code — revoke the lot.
  if (record.revoked_at) {
    await revokeAllFor(admin, record.client_id, record.user_id)
    return oauthError(res, 400, 'invalid_grant', 'Refresh token has already been used')
  }
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    return oauthError(res, 400, 'invalid_grant', 'Refresh token has expired')
  }
  if (record.client_id !== clientId) {
    return oauthError(res, 400, 'invalid_grant', 'Refresh token was issued to another client')
  }

  const { data: rotated, error: rotateError } = await admin
    .from('oauth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', record.token_hash)
    .is('revoked_at', null)
    .select('token_hash')

  if (rotateError) throw new Error(rotateError.message)
  if (!rotated || rotated.length === 0) {
    await revokeAllFor(admin, record.client_id, record.user_id)
    return oauthError(res, 400, 'invalid_grant', 'Refresh token has already been used')
  }

  // Retire the access token this refresh token was paired with, so a refresh
  // genuinely replaces the old credential rather than adding a second live one.
  if (record.access_token_hash) {
    await admin
      .from('oauth_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', record.access_token_hash)
      .is('revoked_at', null)
  }

  // A refresh may narrow scope but never widen it (RFC 6749 §6).
  let scope = record.scope
  if (requestedScope) {
    const held = String(record.scope ?? '').split(/\s+/)
    const asked = String(requestedScope).split(/\s+/).filter(s => held.includes(s))
    if (asked.length) scope = asked.join(' ')
  }

  const tokens = await issueTokenPair(admin, {
    clientId: record.client_id,
    userId: record.user_id,
    scope,
    resource: record.resource,
  })
  return json(res, 200, tokens)
}
