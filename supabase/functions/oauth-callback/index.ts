import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tokenRequest } from "../_shared/providers.ts";
import { verifyState } from "../_shared/state.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const success = Deno.env.get("OAUTH_SUCCESS_REDIRECT") ?? "/";
  try {
    if (!code || !state) throw new Error("missing code/state");
    const { uid, provider } = await verifyState(state, Deno.env.get("OAUTH_STATE_SECRET")!);

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;
    const t = await tokenRequest(provider, { grant_type: "authorization_code", code, redirect_uri: redirectUri });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("oauth_connections").upsert({
      user_id: uid, provider,
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
      scopes: t.scope ?? null,
      metadata: { workspace_id: t.workspace_id, workspace_name: t.workspace_name, bot_id: t.bot_id },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });
    if (error) throw error;

    return Response.redirect(`${success}?connected=${provider}`, 302);
  } catch (e) {
    return Response.redirect(`${success}?error=${encodeURIComponent(String((e as Error).message ?? e))}`, 302);
  }
});
