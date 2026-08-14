import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// Human-readable copy for each scope we grant. Anything unrecognised is still
// shown, so a scope added later never silently disappears from the screen.
const SCOPE_COPY = {
  'crm:read': 'Read prospects, pipelines and activity history',
  'crm:write': 'Add notes to a prospect\'s activity log',
}

/**
 * The browser half of the OAuth authorization step — the page an MCP client
 * (claude.ai) redirects the user to. It reuses the app's own Supabase session
 * rather than asking for credentials again, then hands the decision to
 * /api/oauth/authorize, which is where the client and redirect_uri are checked
 * and the authorization code is minted.
 *
 * Nothing security-relevant is decided here: this screen cannot mint a code,
 * and it never sees a client secret. It exists to identify the requester and
 * capture consent.
 */
export default function OAuthConsent() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()

  const [client, setClient] = useState(null)
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(null) // 'allow' | 'deny' | null

  const params = {
    client_id: searchParams.get('client_id'),
    redirect_uri: searchParams.get('redirect_uri'),
    response_type: searchParams.get('response_type'),
    code_challenge: searchParams.get('code_challenge'),
    code_challenge_method: searchParams.get('code_challenge_method') ?? 'S256',
    state: searchParams.get('state'),
    scope: searchParams.get('scope'),
    resource: searchParams.get('resource'),
  }

  const scopes = (params.scope ?? 'crm:read').split(/\s+/).filter(Boolean)

  // Send unauthenticated visitors through the normal login, carrying the whole
  // pending authorization so they return to exactly this request.
  useEffect(() => {
    if (authLoading || user) return
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
    window.location.replace(`/login?next=${next}`)
  }, [authLoading, user])

  useEffect(() => {
    if (!user) return

    if (!params.client_id || !params.redirect_uri) {
      setError('This authorization link is missing client_id or redirect_uri.')
      setChecking(false)
      return
    }
    if (params.response_type && params.response_type !== 'code') {
      setError(`Unsupported response_type "${params.response_type}". Only "code" is supported.`)
      setChecking(false)
      return
    }
    if (!params.code_challenge || params.code_challenge_method !== 'S256') {
      setError('This client did not send a valid PKCE challenge (S256 is required).')
      setChecking(false)
      return
    }

    let cancelled = false
    async function describe() {
      try {
        const query = new URLSearchParams({
          client_id: params.client_id,
          redirect_uri: params.redirect_uri,
        })
        const res = await fetch(`/api/oauth/authorize?${query}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error_description ?? data.error ?? 'Unknown client.')
        } else if (data.redirect_uri_registered === false) {
          setError('This redirect address is not registered for that application.')
        } else {
          setClient(data)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    describe()
    return () => { cancelled = true }
  }, [user, params.client_id, params.redirect_uri, params.response_type, params.code_challenge, params.code_challenge_method])

  async function decide(decision) {
    setSubmitting(decision)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your Atom session expired. Reload and sign in again.')

      const res = await fetch('/api/oauth/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...params, decision }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error_description ?? data.error ?? 'Authorization failed.')

      // Leaving the SPA entirely — the destination belongs to the client.
      window.location.href = data.redirect_to
    } catch (e) {
      setError(e.message)
      setSubmitting(null)
    }
  }

  const appName = client?.client_name || 'An application'

  return (
    <div className="flex items-center justify-center min-h-screen bg-ink px-4">
      <div className="bg-card border border-line rounded-[26px] p-8 w-full max-w-md">
        <div className="font-display font-bold text-2xl tracking-tight text-paper mb-6">
          ATOM<span className="text-fog">.</span>
        </div>

        {authLoading || checking ? (
          <div className="flex items-center gap-3 text-paper-dim text-sm py-6">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Checking the request...
          </div>
        ) : error ? (
          <>
            <p className="font-display font-bold text-paper text-lg">Can't authorize this request</p>
            <p className="text-down text-sm mt-2 leading-relaxed">{error}</p>
            <p className="text-fog text-xs mt-4">
              Nothing was shared. You can close this tab and try connecting again.
            </p>
          </>
        ) : (
          <>
            <p className="font-display font-bold text-paper text-lg leading-snug">
              {appName} wants to access your Atom account
            </p>
            {client?.client_uri && (
              <p className="text-fog text-xs font-mono mt-1 break-all">{client.client_uri}</p>
            )}

            <div className="mt-6">
              <p className="font-mono text-accent text-[10px] uppercase tracking-wide mb-3">
                It will be able to
              </p>
              <div className="flex flex-col gap-2">
                {scopes.map(scope => (
                  <div key={scope} className="bg-ink border border-line rounded-xl px-4 py-3">
                    <p className="text-paper text-sm">{SCOPE_COPY[scope] ?? scope}</p>
                    <p className="text-fog text-[10px] font-mono mt-0.5">{scope}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-fog text-xs mt-4 leading-relaxed">
              Prospect data in Atom is shared across the team, so this grants access to all of it.
              Daily stats stay restricted to exec and admin accounts. Signed in as{' '}
              <span className="text-paper-dim">{user?.email}</span>.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => decide('deny')}
                disabled={submitting !== null}
                className="flex-1 bg-card-2 text-paper-dim border border-line hover:text-paper hover:border-paper-dim rounded-full py-2.5 font-mono text-[11px] uppercase tracking-wide transition disabled:opacity-50"
              >
                {submitting === 'deny' ? 'Cancelling...' : 'Deny'}
              </button>
              <button
                onClick={() => decide('allow')}
                disabled={submitting !== null}
                className="flex-1 bg-paper hover:bg-paper/90 text-ink rounded-full py-2.5 font-display font-bold text-sm transition disabled:opacity-50"
              >
                {submitting === 'allow' ? 'Connecting...' : 'Allow'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
