import { supabase } from '../lib/supabase'

// Kicks off / tears down the OAuth link between Atom and a third-party service
// (currently just Notion). The token itself never reaches the browser — this
// only starts the redirect dance; oauth-start and oauth-callback do the rest.
export function useOAuthConnect() {
  // returnTo is a path inside this app, not a full URL: oauth-callback appends
  // it to the configured success redirect so the user lands back where they
  // started rather than on the dashboard.
  async function connect(provider = 'notion', returnTo = window.location.pathname) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Your session has expired. Sign in again.')

    const params = new URLSearchParams({ provider })
    if (returnTo?.startsWith('/')) params.set('return_to', returnTo)

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-start?${params}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    )
    const { url, error } = await res.json()
    if (error) throw new Error(error)
    window.location.href = url
  }

  const disconnect = (provider) => supabase.rpc('disconnect_provider', { p_provider: provider })
  const listConnections = async () => (await supabase.rpc('get_connected_providers')).data ?? []

  return { connect, disconnect, listConnections }
}
