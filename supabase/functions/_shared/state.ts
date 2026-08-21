const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Uint8Array.from(atob(s + pad), (c) => c.charCodeAt(0));
}
async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signState(payload: Record<string, unknown>, secret: string) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}
export async function verifyState(token: string, secret: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("bad state");
  const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig), enc.encode(body));
  if (!ok) throw new Error("state signature invalid");
  const payload = JSON.parse(dec.decode(fromB64url(body)));
  if (payload.exp && Date.now() > payload.exp) throw new Error("state expired");
  return payload as {
    uid: string;
    provider: string;
    nonce: string;
    exp: number;
    returnTo?: string;
  };
}
