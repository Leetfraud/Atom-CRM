import { handlePreflight, jsonCached, methodNotAllowed, json } from '../_lib/http.js'
import { issuer, resourceUrl } from '../_lib/supabase.js'
import { SCOPES } from '../_lib/oauth.js'

/**
 * Protected resource metadata (RFC 9728).
 *
 * This is the first document an MCP client reads. The flow is: client hits
 * /api/mcp unauthenticated -> gets a 401 whose WWW-Authenticate header points
 * here -> reads this to learn which authorization server guards the resource ->
 * fetches that server's metadata -> registers and starts the auth code flow.
 */
export default function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET', 'OPTIONS'])

  let base
  let resource
  try {
    base = issuer()
    resource = resourceUrl()
  } catch (e) {
    return json(res, 500, { error: 'server_error', error_description: e.message })
  }

  jsonCached(res, {
    resource,
    authorization_servers: [base],
    scopes_supported: SCOPES,
    bearer_methods_supported: ['header'],
    resource_name: 'Atom CRM',
  })
}
