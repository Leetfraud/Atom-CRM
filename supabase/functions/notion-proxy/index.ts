// ---------------------------------------------------------------------------
// Notion proxy — the server side of the live import.
//
// The browser never sees a Notion token. It calls this function with its own
// Supabase JWT; we swap that for the user's stored Notion access token (which
// getValidToken refreshes and re-stores on rotation) and forward to Notion.
//
// Three actions, matching the three steps of the import flow:
//   list_databases  pick which database to pull from
//   query_database  every row's properties (the CSV half of a Notion export)
//   page_bodies     nested block trees for a batch of pages (the .md half)
//
// Pagination is walked here rather than in the browser: one invocation returns
// a complete answer, so the client does not have to juggle Notion cursors.
// page_bodies is the exception — it is capped per call because each page costs
// at least one request, and the client feeds it ids in batches for progress.
// ---------------------------------------------------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { adminClient, getValidToken } from "../_shared/token.ts";

const NOTION_VERSION = "2022-06-28";
const NOTION_API = "https://api.notion.com/v1";

const PAGE_SIZE = 100; // Notion's per-request maximum
const MAX_ROWS = 5000; // safety cap on a single query_database call
const MAX_BODY_IDS = 40; // pages per page_bodies call
const MAX_BLOCK_DEPTH = 3; // how far to follow has_children
const CONCURRENCY = 3; // Notion's published limit is ~3 requests/second
const MAX_RETRIES = 4;

// Notion answers 429 with a Retry-After (in seconds). Honour it rather than
// hammering; 5xx is transient and gets the same backoff treatment.
async function notionFetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  for (let attempt = 0;; attempt++) {
    const res = await fetch(`${NOTION_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (res.status === 429 || res.status >= 500) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`notion ${res.status} after ${MAX_RETRIES} retries on ${path}`);
      }
      const retryAfter = Number(res.headers.get("Retry-After"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(2 ** attempt * 500, 8000);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const json = await res.json();
    if (!res.ok) {
      const msg = (json as { message?: string }).message ?? JSON.stringify(json);
      throw new Error(`notion ${res.status}: ${msg}`);
    }
    return json as Record<string, unknown>;
  }
}

// Run tasks through a fixed number of workers so we stay under the rate limit.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

// deno-lint-ignore no-explicit-any
type Any = any;

// Keep only what the client-side markdown renderer reads. A raw block carries
// created_by / parent / per-item annotations; across ~950 pages that padding
// dominates the response, so each block is reduced to its renderable core.
function trimRichText(rich: Any[] | undefined) {
  return (rich ?? []).map((r) => {
    const a = r.annotations ?? {};
    const out: Record<string, unknown> = { plain_text: r.plain_text ?? "" };
    if (r.href) out.href = r.href;
    if (a.bold) out.bold = true;
    if (a.italic) out.italic = true;
    if (a.code) out.code = true;
    if (a.strikethrough) out.strikethrough = true;
    return out;
  });
}

function trimBlock(block: Any, children: Any[]) {
  const type: string = block.type;
  const payload = block[type] ?? {};
  const out: Record<string, unknown> = { type };

  const rich = trimRichText(payload.rich_text ?? payload.caption);
  if (rich.length) out.rich_text = rich;

  if (type === "to_do") out.checked = !!payload.checked;
  if (type === "code" && payload.language) out.language = payload.language;
  if (type === "child_page" || type === "child_database") out.title = payload.title ?? "";
  if (type === "equation") out.expression = payload.expression ?? "";
  if (type === "table_row") {
    out.cells = (payload.cells ?? []).map((cell: Any[]) => trimRichText(cell));
  }

  // Every block type that can carry a URL puts it somewhere different.
  const url = payload.url ??
    payload.external?.url ??
    payload.file?.url ??
    (type === "link_to_page" ? payload.page_id : undefined);
  if (url) out.url = url;

  if (children.length) out.children = children;
  return out;
}

// Depth-first fetch of a block subtree, following has_children up to the cap.
async function fetchBlocks(token: string, blockId: string, depth = 0): Promise<Any[]> {
  const collected: Any[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: String(PAGE_SIZE) });
    if (cursor) params.set("start_cursor", cursor);
    const res = await notionFetch(token, `/blocks/${blockId}/children?${params}`) as Any;

    for (const block of res.results ?? []) {
      const children = block.has_children && depth < MAX_BLOCK_DEPTH
        ? await fetchBlocks(token, block.id, depth + 1)
        : [];
      collected.push(trimBlock(block, children));
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return collected;
}

async function listDatabases(token: string, query: string) {
  const databases: Any[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      page_size: PAGE_SIZE,
      filter: { property: "object", value: "database" },
    };
    if (query) body.query = query;
    if (cursor) body.start_cursor = cursor;

    const res = await notionFetch(token, "/search", {
      method: "POST",
      body: JSON.stringify(body),
    }) as Any;

    for (const db of res.results ?? []) {
      databases.push({
        id: db.id,
        title: (db.title ?? []).map((t: Any) => t.plain_text ?? "").join("").trim() || "Untitled",
        url: db.url ?? "",
        last_edited_time: db.last_edited_time ?? null,
        // Surfaced in the picker so two similarly named databases are tellable apart.
        properties: Object.keys(db.properties ?? {}),
      });
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return databases;
}

async function queryDatabase(token: string, databaseId: string) {
  const pages: Any[] = [];
  let cursor: string | undefined;
  let truncated = false;

  do {
    const body: Record<string, unknown> = { page_size: PAGE_SIZE };
    if (cursor) body.start_cursor = cursor;

    const res = await notionFetch(token, `/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    }) as Any;

    for (const page of res.results ?? []) {
      pages.push({
        id: page.id,
        url: page.url ?? "",
        last_edited_time: page.last_edited_time ?? null,
        properties: page.properties ?? {},
      });
    }

    cursor = res.has_more ? res.next_cursor : undefined;
    if (pages.length >= MAX_ROWS && cursor) {
      truncated = true;
      cursor = undefined;
    }
  } while (cursor);

  return { pages, truncated };
}

// One failing page must not sink the whole batch — a page deleted between the
// query and this call, or one the integration lost access to, comes back with
// an error string so the client can flag that single row and carry on.
async function pageBodies(token: string, ids: string[]) {
  const capped = ids.slice(0, MAX_BODY_IDS);
  return await mapLimit(capped, CONCURRENCY, async (id) => {
    try {
      return { id, blocks: await fetchBlocks(token, id) };
    } catch (e) {
      return { id, blocks: [], error: String((e as Error).message ?? e) };
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "not authenticated" }, 401);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "list_databases";

    const accessToken = await getValidToken(adminClient(), user.id, "notion");

    switch (action) {
      case "list_databases":
        return json({ databases: await listDatabases(accessToken, String(body.query ?? "").trim()) });

      case "query_database": {
        if (!body.database_id) return json({ error: "database_id is required" }, 400);
        return json(await queryDatabase(accessToken, String(body.database_id)));
      }

      case "page_bodies": {
        if (!Array.isArray(body.page_ids)) return json({ error: "page_ids must be an array" }, 400);
        return json({ bodies: await pageBodies(accessToken, body.page_ids.map(String)) });
      }

      default:
        return json({ error: `unknown action ${action}` }, 400);
    }
  } catch (e) {
    const message = String((e as Error).message ?? e);
    // "no notion connection" is the expected state before the user connects —
    // the client keys its "Connect Notion" prompt off this status.
    const status = /no notion connection|reconnect required/i.test(message) ? 428 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
