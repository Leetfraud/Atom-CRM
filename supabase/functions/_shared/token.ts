import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tokenRequest } from "./providers.ts";

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// deno-lint-ignore no-explicit-any
export async function getValidToken(admin: any, userId: string, provider: string) {
  const { data, error } = await admin.from("oauth_connections")
    .select("*").eq("user_id", userId).eq("provider", provider).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`no ${provider} connection`);

  const fresh = !data.expires_at || new Date(data.expires_at).getTime() - 60_000 > Date.now();
  if (fresh) return data.access_token;
  if (!data.refresh_token) throw new Error(`${provider} token expired; reconnect required`);

  const t = await tokenRequest(provider, { grant_type: "refresh_token", refresh_token: data.refresh_token });
  await admin.from("oauth_connections").update({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? data.refresh_token, // Notion rotates -> store the new one
    expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("provider", provider);
  return t.access_token;
}
