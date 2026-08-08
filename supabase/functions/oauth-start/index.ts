import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PROVIDERS } from "../_shared/providers.ts";
import { signState } from "../_shared/state.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const provider = new URL(req.url).searchParams.get("provider") ?? "notion";
    const cfg = PROVIDERS[provider];
    if (!cfg) throw new Error(`unknown provider ${provider}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error("not authenticated");

    const state = await signState(
      { uid: user.id, provider, nonce: crypto.randomUUID(), exp: Date.now() + 10 * 60 * 1000 },
      Deno.env.get("OAUTH_STATE_SECRET")!,
    );
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;
    const params = new URLSearchParams({
      client_id: Deno.env.get(cfg.clientIdEnv)!,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      ...(cfg.extraAuthorizeParams ?? {}),
    });
    return new Response(JSON.stringify({ url: `${cfg.authorizeUrl}?${params}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
