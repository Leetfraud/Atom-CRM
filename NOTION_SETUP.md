# Notion integration — setup

How to connect Atom to Notion so the email pipeline can be imported directly from
the database instead of a downloaded zip.

Once connected, **Import → Notion (live)** reads the database over the API, matches
rows against the LinkedIn CSV, and shows the same review screen as before. Nothing
is written until you confirm.

The zip/folder upload has not gone anywhere — it is the **File upload** tab, and it
still works without a Notion connection (useful against an archived export).

---

## Prerequisites

- Admin access to the Notion workspace holding the email pipeline database
- Access to the Supabase project dashboard, or the `supabase` CLI logged in
- An Atom user whose `profiles.role` is `exec` or `admin` — `/import` is role-gated
  and a `sales` user will not see the page at all

---

## 1. Create a **public** Notion integration

> This is the step most likely to trip you up. An **Internal** integration will not
> work. Internal integrations authenticate with a single fixed secret token; Atom
> performs a full OAuth authorization-code exchange, which only **Public**
> integrations support.

1. Go to <https://www.notion.so/my-integrations> → **New integration**
2. Set the type to **Public**
3. Fill in the details Notion requires for a public integration: company name,
   homepage URL, privacy policy URL, terms of use URL, support email

   These look like a wall but are not. They only have to be *filled in*.
   Verification is a separate process needed to list the integration publicly —
   an **unverified public integration works fine** against your own workspace.

4. Set the **Redirect URI** to exactly:

   ```
   https://hyzwpmrebxcpzdxsbaqg.supabase.co/functions/v1/oauth-callback
   ```

   (That is `<your-supabase-url>/functions/v1/oauth-callback`. It must match
   character for character or Notion rejects the authorize request.)

5. Capabilities: **Read content** is sufficient. The proxy only calls `search`,
   `databases/query` and `blocks/children` — nothing is ever written back to Notion.

6. Copy the **OAuth client ID** and **OAuth client secret**.

---

## 2. Set the Supabase secrets

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
into edge functions automatically. Four more are needed:

| Secret | Value |
| --- | --- |
| `NOTION_OAUTH_CLIENT_ID` | from step 1 |
| `NOTION_OAUTH_CLIENT_SECRET` | from step 1 |
| `OAUTH_STATE_SECRET` | any long random string — signs the OAuth `state` blob |
| `OAUTH_SUCCESS_REDIRECT` | the deployed app's origin, e.g. `https://your-app.vercel.app` |

```bash
supabase secrets set \
  NOTION_OAUTH_CLIENT_ID=xxx \
  NOTION_OAUTH_CLIENT_SECRET=xxx \
  OAUTH_STATE_SECRET=$(openssl rand -hex 32) \
  OAUTH_SUCCESS_REDIRECT=https://your-app.vercel.app
```

> **`OAUTH_SUCCESS_REDIRECT` must be an absolute URL.** If it is relative or unset,
> the callback resolves it against the Supabase functions origin and drops the user
> on a function URL instead of Atom. It will not crash, but the connection will look
> like it went nowhere.

Or set them in the dashboard under **Edge Functions → Secrets**.

---

## 3. Deploy the edge functions

```bash
supabase functions deploy oauth-start oauth-callback notion-proxy
```

`supabase/functions/_shared/` is bundled automatically.

> **Deploying from the dashboard instead of the CLI?** `config.toml` is not read, so
> you must manually switch **Verify JWT off** for `oauth-callback`. Notion redirects
> the browser to that endpoint with no `Authorization` header — with JWT verification
> on it returns 401 and the connection silently never completes. The CLI reads this
> from `supabase/config.toml`, where it is already set.
>
> `oauth-start` and `notion-proxy` are called by the app with a real user session, so
> they keep JWT verification **on**.

---

## 4. Run the migrations

In **Supabase → SQL Editor**, run in order:

1. `supabase/migrations/20260821090000_oauth_connections.sql`
   — token storage, plus the `get_connected_providers` / `disconnect_provider` RPCs
2. `supabase/migrations/20260821093000_prospects_notion_sync.sql`
   — adds `prospects.notion_page_id` and `prospects.notion_last_edited_at`, which are
   what make a re-import update rather than duplicate

Both are written to be safe to re-run.

---

## 5. Share the database with the integration

During the OAuth consent screen you choose which pages to share. **The token only
ever sees what you pick there** — this is a Notion-side restriction, not something
Atom can widen.

If the database does not show up in Atom's picker afterwards, open it in Notion →
`⋯` → **Connections** → add your integration.

A database nested under a page you selected is included automatically. One that is
not, is not.

---

## 6. Check the database's columns

The importer matches these column names case- and space-insensitively, first match
wins:

| Looking for | Accepted column names | Notes |
| --- | --- | --- |
| Name | *any* | Matched by property **type** (`title`), so a renamed title column is fine |
| Stage | `Status`, `Stage` | Snapped against `EMAIL_PIPELINE_STAGES` in `src/utils/constants.js`; an unrecognised value imports blank |
| Tags | `Label`, `Labels`, `Tags` | Multi-select, comma-joined |
| LinkedIn match | `LinkedIn Request`, `Linkedin Request` | Checkbox. **Only rows with this ticked are eligible to match a LinkedIn CSV row** |

Page-body conventions are unchanged from the zip export — `Email:`, `LinkedIn:`,
`YouTube:` label lines, and `gamma.app` links anywhere in the body.

---

## 7. Run the import

1. Sign in as an `exec` / `admin` user
2. **Import → Notion (live) → Connect Notion**
3. Approve, choosing the pipeline database on the consent screen
4. Back in Atom, pick the database and press **Pull from Notion**

Two options on that screen:

- **Read page content** — needed for emails, Gamma links and notes. This is the slow
  part: roughly one API request per page against Notion's ~3/second limit. Uncheck
  for a fast properties-only pull.
- **Skip pages unchanged since the last import** — on by default, and what makes a
  re-run quick.

The first run of a ~950-page database takes a few minutes. Later runs are seconds,
because unchanged pages are skipped entirely.

---

## Re-running the import

It is safe to re-run. Pages already imported are matched on `notion_page_id` and
**updated in place** rather than added a second time. The review screen labels them
`↻ Update` and the source dropdown gains **New only** / **Updates only** filters.

What an update does:

| | Behaviour |
| --- | --- |
| Name, company, role, email, LinkedIn/Gamma/YouTube URLs, place | Refreshed from Notion **when Notion has a value**. A blank incoming value never blanks a stored one |
| Email stage | Synced — but only for rows that actually came from the email pipeline |
| LinkedIn connection / DM status | Synced — but only for rows that came from the LinkedIn CSV |
| Tags | **Additive.** A tag added in Atom but absent from Notion stays. Removing a tag is a deliberate act, not a sync side effect |
| Notes | **Never overwritten.** The page body seeds `prospects.notes` on first import, but that field is what the team edits in Atom afterwards. New prospects get their notes; existing ones keep theirs |
| Serial | Preserved |

Identity is re-resolved against the database at write time, not trusted from the
review screen, so a concurrent import cannot produce a duplicate.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Picker is empty after connecting | The database was not shared on the consent screen. See step 5. Notion's `search` returns an empty list rather than an error, so this looks like a bug but is not |
| Connect redirects back with `?error=...` | Read the message in the URL. A signature/expiry error means `OAUTH_STATE_SECRET` differs between `oauth-start` and `oauth-callback` — i.e. it was changed between the two deploys |
| Connect goes to a Supabase URL, not Atom | `OAUTH_SUCCESS_REDIRECT` is unset or relative. See step 2 |
| Connection appears to do nothing | `verify_jwt` is still on for `oauth-callback`. See step 3 |
| `no notion connection` in the UI | Expected before connecting — the app shows the **Connect Notion** panel on this. If it persists after connecting, the callback failed to write to `oauth_connections` (check step 4 ran) |
| `notion 401` after weeks of working | The token expired and no refresh token was stored. Notion only issues one for workspaces with token rotation enabled; reconnect |
| Everything imports as new on a re-run | Migration 2 has not been applied, so `notion_page_id` does not exist |
| Import fails on `column ... does not exist` | Same — migration 2 has not been applied |

---

## Reference

**Edge functions**

| Function | JWT | Role |
| --- | --- | --- |
| `oauth-start` | on | Builds the Notion authorize URL with a signed, 10-minute `state` |
| `oauth-callback` | **off** | Exchanges the code, stores the token in `oauth_connections` |
| `notion-proxy` | on | `list_databases` / `query_database` / `page_bodies`. The browser never sees a Notion token |

**Frontend**

- `src/components/import/NotionSource.jsx` — connect, pick, pull
- `src/hooks/useNotionImport.js` — proxy calls, body batching, unchanged-page skipping
- `src/hooks/useImportCommit.js` — the insert/update split
- `src/utils/notion/` — blocks → markdown, properties → flat record

Both import routes converge on `buildEmailContact()` in
`src/utils/importParsers/index.js`. The live path renders Notion blocks back into the
same markdown dialect the zip export produces, so one set of parsers — the ones
validated against the real 954-file export — handles both.
