export const PROVIDERS: Record<string, {
  authorizeUrl: string; tokenUrl: string;
  clientIdEnv: string; clientSecretEnv: string;
  extraAuthorizeParams?: Record<string, string>;
  auth: "basic" | "body"; bodyFormat: "json" | "form";
  extraHeaders?: Record<string, string>;
}> = {
  notion: {
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    clientIdEnv: "NOTION_OAUTH_CLIENT_ID",
    clientSecretEnv: "NOTION_OAUTH_CLIENT_SECRET",
    extraAuthorizeParams: { owner: "user" },
    auth: "basic",            // Notion wants client creds as HTTP Basic, not in the body
    bodyFormat: "json",       // Notion's token endpoint takes JSON (most others take "form")
    extraHeaders: { "Notion-Version": "2022-06-28" },
  },
};

export async function tokenRequest(provider: string, params: Record<string, string>) {
  const cfg = PROVIDERS[provider];
  const clientId = Deno.env.get(cfg.clientIdEnv)!;
  const clientSecret = Deno.env.get(cfg.clientSecretEnv)!;
  const headers: Record<string, string> = { ...(cfg.extraHeaders ?? {}) };
  const payload: Record<string, string> = { ...params };

  if (cfg.auth === "basic") headers["Authorization"] = "Basic " + btoa(`${clientId}:${clientSecret}`);
  else { payload.client_id = clientId; payload.client_secret = clientSecret; }

  let body: string;
  if (cfg.bodyFormat === "json") { headers["Content-Type"] = "application/json"; body = JSON.stringify(payload); }
  else { headers["Content-Type"] = "application/x-www-form-urlencoded"; body = new URLSearchParams(payload).toString(); }

  const res = await fetch(cfg.tokenUrl, { method: "POST", headers, body });
  const json = await res.json();
  if (!res.ok) throw new Error(`token endpoint ${res.status}: ${JSON.stringify(json)}`);
  return json; // { access_token, refresh_token?, expires_in?, scope?, workspace_id?, ... }
}
