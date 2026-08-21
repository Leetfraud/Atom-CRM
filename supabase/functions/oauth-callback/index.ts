import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tokenRequest } from "../_shared/providers.ts";
import { verifyState } from "../_shared/state.ts";

// The return path may already carry a query string, so set the parameter on a
// parsed URL rather than assuming a bare "?" is safe to append.
function withParam(target: string, key: string, value: string) {
  const u = new URL(target);
  u.searchParams.set(key, value);
  return u.toString();
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Response.redirect rejects anything that is not an absolute URL, and this
  // runs in the error path too — so resolve the configured redirect once, up
  // front, against our own origin. A misconfigured (or unset) env var then
  // lands somewhere useless rather than turning every failure into a 500.
  const base = new URL(Deno.env.get("OAUTH_SUCCESS_REDIRECT") ?? "/", url.origin).toString();
  // On failure the state may be unreadable, so fall back to that default.
  let success = base;
  try {
    if (!code || !state) throw new Error("missing code/state");
    const { uid, provider, returnTo } = await verifyState(state, Deno.env.get("OAUTH_STATE_SECRET")!);

    // returnTo was validated as a same-site path before being signed, and the
    // signature is what makes it trustworthy now.
    if (returnTo) success = new URL(returnTo, base).toString();

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

    return Response.redirect(withParam(success, "connected", provider), 302);
  } catch (e) {
    return Response.redirect(withParam(success, "error", String((e as Error).message ?? e)), 302);
  }
});
