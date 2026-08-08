import { supabase } from "../lib/supabase"; // adjust path if your client lives elsewhere

export function useOAuthConnect() {
  async function connect(provider = "notion") {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-start?provider=${provider}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    );
    const { url, error } = await res.json();
    if (error) throw new Error(error);
    window.location.href = url;
  }
  const disconnect = (provider) => supabase.rpc("disconnect_provider", { p_provider: provider });
  const listConnections = async () => (await supabase.rpc("get_connected_providers")).data ?? [];
  return { connect, disconnect, listConnections };
}
