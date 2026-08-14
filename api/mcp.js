import { applyCors, handlePreflight, json, readBody } from './_lib/http.js'
import { adminClient, issuer } from './_lib/supabase.js'
import { scopeAllows, verifyAccessToken } from './_lib/oauth.js'

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'atom-crm', version: '1.0.0' }

// Mirrors the app's route guard: /analytics, /daily-log and /import are
// exec-only in ProtectedRoute, and 'admin' bypasses every restriction. Without
// this, connecting a CRM connector would be a privilege-escalation path — a
// 'sales' user who cannot open the Daily Log page could still read daily_stats
// through MCP.
const EXEC_ROLES = new Set(['exec', 'admin'])

const PROSPECT_SELECT = `
  id, serial, first_name, last_name, company, role_title, email,
  linkedin_url, company_url, youtube_url, gamma_doc_url, place, notes,
  created_at, updated_at,
  email_pipeline(stage, replied, emails_sent, sequence_stage, inbox_used, last_email_date),
  linkedin_pipeline(connection_status, dm_status, follow_ups_sent, call_booked, onboarded, last_action_date, outcome_notes),
  prospect_tags(tag)
`

const TOOLS = [
  {
    name: 'search_prospects',
    description:
      'Search Atom CRM prospects by free text and/or pipeline filters. Free text matches name, company, role, email, place, notes and any of the stored URLs. Returns summary records; use get_prospect for full detail including activity history.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search across name, company, role, email, notes and URLs.' },
        email_stage: { type: 'string', description: 'Exact email pipeline stage, e.g. "Call Booked" or "Closed".' },
        li_dm_status: { type: 'string', description: 'Exact LinkedIn DM status, e.g. "Replied - Interested".' },
        tag: { type: 'string', description: 'Only prospects carrying this tag, e.g. "Qualified".' },
        replied: { type: 'boolean', description: 'Filter to prospects who have (or have not) replied by email.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_prospect',
    description:
      'Fetch one prospect in full — identity, links, both pipelines, tags and the complete activity log. Identify it by serial (e.g. "LEAD-014") or by id.',
    inputSchema: {
      type: 'object',
      properties: {
        serial: { type: 'string', description: 'Prospect serial, e.g. "LEAD-014".' },
        id: { type: 'string', description: 'Prospect UUID. Use serial unless you already have the id.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'pipeline_summary',
    description:
      'Aggregate counts across the whole prospect list: totals by email pipeline stage, by LinkedIn connection status and DM status, plus reply and close counts. Use this for "how is the pipeline doing" questions instead of paging through search results.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_daily_stats',
    description:
      'Daily activity and revenue figures for one month (emails sent, replies, LinkedIn DMs, docs opened, calls booked, closes, cash collected, revenue), with month totals and derived reply/close/doc-open rates. Requires an exec or admin account.',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', pattern: '^\\d{4}-\\d{2}$', description: 'Month as YYYY-MM, e.g. "2026-08".' },
      },
      required: ['month'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_prospect_note',
    description:
      'Append a note to a prospect\'s activity log. Requires the crm:write scope. Use get_prospect or search_prospects first to confirm the right prospect.',
    inputSchema: {
      type: 'object',
      properties: {
        prospect_id: { type: 'string', description: 'Prospect UUID, as returned by search_prospects or get_prospect.' },
        type: { type: 'string', enum: ['email', 'linkedin'], description: 'Which activity tab the note belongs to.' },
        note: { type: 'string', minLength: 1, maxLength: 4000 },
      },
      required: ['prospect_id', 'type', 'note'],
      additionalProperties: false,
    },
  },
]

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  applyCors(res)
  res.setHeader('MCP-Protocol-Version', PROTOCOL_VERSION)

  if (req.method !== 'POST') {
    // GET on the MCP endpoint is the Streamable HTTP server-push channel. This
    // server is request/response only, so decline it rather than hanging.
    return json(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' })
  }

  const admin = adminClient()
  const token = await verifyAccessToken(admin, req.headers.authorization)
  if (!token) return unauthorized(res)

  const body = readBody(req)
  // JSON-RPC batching was removed in MCP 2025-06-18.
  if (Array.isArray(body)) {
    return json(res, 400, rpcError(null, -32600, 'Batch requests are not supported'))
  }
  if (!body || body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return json(res, 400, rpcError(body?.id ?? null, -32600, 'Invalid JSON-RPC request'))
  }

  // Notifications carry no id and take no response.
  const isNotification = body.id === undefined || body.id === null
  if (isNotification) {
    res.status(202).end()
    return
  }

  try {
    const result = await dispatch(admin, token, body)
    return json(res, 200, { jsonrpc: '2.0', id: body.id, result })
  } catch (e) {
    if (e instanceof RpcError) return json(res, 200, rpcError(body.id, e.code, e.message))
    return json(res, 200, rpcError(body.id, -32603, `Internal error: ${e.message}`))
  }
}

class RpcError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

/**
 * A 401 here is what bootstraps the whole OAuth dance: the WWW-Authenticate
 * header tells an unauthenticated MCP client where to find the metadata that
 * names this resource's authorization server (RFC 9728 §5.1).
 */
function unauthorized(res) {
  let metadataUrl
  try {
    metadataUrl = `${issuer()}/.well-known/oauth-protected-resource`
  } catch {
    metadataUrl = '/.well-known/oauth-protected-resource'
  }
  applyCors(res)
  res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${metadataUrl}"`)
  return json(res, 401, { error: 'invalid_token', error_description: 'Missing or invalid access token' })
}

async function dispatch(admin, token, body) {
  switch (body.method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Atom CRM. Prospect and pipeline data plus daily activity figures. Prospect records are shared across the whole team, not per-user. Daily stats require an exec or admin account.',
      }
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: TOOLS }
    case 'tools/call':
      return await callTool(admin, token, body.params ?? {})
    default:
      throw new RpcError(-32601, `Method not found: ${body.method}`)
  }
}

/** Tool results are content blocks; isError reports a tool-level failure. */
function toolText(value, isError = false) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return { content: [{ type: 'text', text }], isError }
}

async function roleFor(admin, userId) {
  const { data } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  return data?.role ?? null
}

async function callTool(admin, token, params) {
  const { name, arguments: args = {} } = params
  const tool = TOOLS.find(t => t.name === name)
  if (!tool) throw new RpcError(-32602, `Unknown tool: ${name}`)

  switch (name) {
    case 'search_prospects':
      return await searchProspects(admin, args)
    case 'get_prospect':
      return await getProspect(admin, args)
    case 'pipeline_summary':
      return await pipelineSummary(admin)
    case 'list_daily_stats':
      return await listDailyStats(admin, token, args)
    case 'add_prospect_note':
      return await addProspectNote(admin, token, args)
    default:
      throw new RpcError(-32602, `Unknown tool: ${name}`)
  }
}

function summarize(row) {
  const email = row.email_pipeline?.[0] ?? {}
  const li = row.linkedin_pipeline?.[0] ?? {}
  return {
    id: row.id,
    serial: row.serial,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ') || null,
    company: row.company,
    role_title: row.role_title,
    place: row.place,
    email: row.email,
    email_stage: email.stage ?? null,
    replied: email.replied ?? false,
    li_connection_status: li.connection_status ?? null,
    li_dm_status: li.dm_status ?? null,
    tags: (row.prospect_tags ?? []).map(t => t.tag),
  }
}

async function searchProspects(admin, args) {
  const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100)

  // A filter on an embedded table only excludes rows when the join is inner —
  // with the default left join, a non-matching parent still comes back, just
  // with an empty child array. Promote each join only when it is filtered on,
  // so an unfiltered search still returns prospects that have no pipeline row.
  const filtersEmail = Boolean(args.email_stage) || typeof args.replied === 'boolean'
  const filtersLinkedin = Boolean(args.li_dm_status)

  let select = PROSPECT_SELECT
  if (filtersEmail) select = select.replace('email_pipeline(', 'email_pipeline!inner(')
  if (filtersLinkedin) select = select.replace('linkedin_pipeline(', 'linkedin_pipeline!inner(')

  let request = admin.from('prospects').select(select).order('created_at', { ascending: false })

  if (args.query) {
    // PostgREST parses `or=(...)` as a comma-separated list, so commas, parens
    // and wildcards inside the value would change the filter's structure rather
    // than being matched literally. Strip them instead of escaping — a search
    // box does not need them.
    const q = String(args.query).replace(/[,()*\\]/g, ' ').trim()
    if (q) {
      const fields = [
        'first_name', 'last_name', 'company', 'role_title', 'email',
        'place', 'notes', 'linkedin_url', 'company_url', 'youtube_url', 'gamma_doc_url',
      ]
      request = request.or(fields.map(f => `${f}.ilike.%${q}%`).join(','))
    }
  }

  if (args.email_stage) request = request.eq('email_pipeline.stage', args.email_stage)
  if (args.li_dm_status) request = request.eq('linkedin_pipeline.dm_status', args.li_dm_status)
  if (typeof args.replied === 'boolean') request = request.eq('email_pipeline.replied', args.replied)

  const { data, error } = await request.limit(limit)
  if (error) return toolText(`Search failed: ${error.message}`, true)

  let rows = data ?? []
  // Tag filtering is applied here rather than in the query: filtering on the
  // embedded prospect_tags would also truncate each row's tag list to the
  // match, and the summary is more useful showing every tag a prospect has.
  if (args.tag) rows = rows.filter(r => (r.prospect_tags ?? []).some(t => t.tag === args.tag))

  if (rows.length === 0) return toolText('No prospects matched those filters.')
  return toolText({ count: rows.length, prospects: rows.map(summarize) })
}

async function getProspect(admin, args) {
  if (!args.serial && !args.id) {
    return toolText('Provide either serial or id.', true)
  }

  let request = admin.from('prospects').select(PROSPECT_SELECT)
  request = args.id ? request.eq('id', args.id) : request.eq('serial', args.serial)

  const { data, error } = await request.maybeSingle()
  if (error) return toolText(`Lookup failed: ${error.message}`, true)
  if (!data) return toolText(`No prospect found for ${args.serial ?? args.id}.`, true)

  const { data: logs } = await admin
    .from('prospect_activity_log')
    .select('type, action, note, created_at')
    .eq('prospect_id', data.id)
    .order('created_at', { ascending: false })

  return toolText({
    ...summarize(data),
    links: {
      linkedin: data.linkedin_url,
      company: data.company_url,
      youtube: data.youtube_url,
      gamma_doc: data.gamma_doc_url,
    },
    notes: data.notes,
    email_pipeline: data.email_pipeline?.[0] ?? null,
    linkedin_pipeline: data.linkedin_pipeline?.[0] ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    activity_log: logs ?? [],
  })
}

async function pipelineSummary(admin) {
  const { data, error } = await admin
    .from('prospects')
    .select('id, email_pipeline(stage, replied), linkedin_pipeline(connection_status, dm_status)')
  if (error) return toolText(`Summary failed: ${error.message}`, true)

  const rows = data ?? []
  const tally = (list, key) =>
    list.reduce((acc, value) => {
      const k = value ?? '(none)'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})

  const emails = rows.map(r => r.email_pipeline?.[0] ?? {})
  const lis = rows.map(r => r.linkedin_pipeline?.[0] ?? {})

  return toolText({
    total_prospects: rows.length,
    replied: emails.filter(e => e.replied).length,
    by_email_stage: tally(emails.map(e => e.stage)),
    by_li_connection_status: tally(lis.map(l => l.connection_status)),
    by_li_dm_status: tally(lis.map(l => l.dm_status)),
  })
}

async function listDailyStats(admin, token, args) {
  const role = await roleFor(admin, token.user_id)
  if (!EXEC_ROLES.has(role)) {
    return toolText(
      'Daily stats are restricted to exec and admin accounts. This connection is authorised as a sales user.',
      true,
    )
  }

  const month = String(args.month ?? '')
  if (!/^\d{4}-\d{2}$/.test(month)) return toolText('month must be formatted YYYY-MM.', true)

  // Compute the range as plain strings — the same reason as useDailyStats:
  // going through Date() mixes UTC parsing with local getters and can drop the
  // last day of the month.
  const [year, mon] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate()

  const { data, error } = await admin
    .from('daily_stats')
    .select('*')
    .gte('date', `${month}-01`)
    .lte('date', `${month}-${String(lastDay).padStart(2, '0')}`)
    .order('date', { ascending: true })

  if (error) return toolText(`Daily stats lookup failed: ${error.message}`, true)

  const rows = data ?? []
  const sum = field => rows.reduce((acc, r) => acc + (r[field] || 0), 0)
  const totals = {
    emails_sent: sum('emails_sent'),
    replies: sum('replies'),
    linkedin_dms: sum('linkedin_dms'),
    docs_opened: sum('docs_opened'),
    calls_booked: sum('calls_booked'),
    closes: sum('closes'),
    cash_collected_usd: sum('cash_collected_usd'),
    revenue: sum('revenue'),
  }
  const rate = (n, d) => (d > 0 ? Number(((n / d) * 100).toFixed(2)) : 0)

  return toolText({
    month,
    days_with_data: rows.length,
    totals,
    rates: {
      reply_rate_pct: rate(totals.replies, totals.emails_sent),
      close_rate_pct: rate(totals.closes, totals.calls_booked),
      doc_open_rate_pct: rate(totals.docs_opened, totals.replies),
    },
    days: rows,
  })
}

async function addProspectNote(admin, token, args) {
  if (!scopeAllows(token.scope, 'crm:write')) {
    return toolText('This connection is read-only. Reconnect granting the crm:write scope.', true)
  }
  if (!args.prospect_id || !args.type || !args.note) {
    return toolText('prospect_id, type and note are all required.', true)
  }
  if (!['email', 'linkedin'].includes(args.type)) {
    return toolText('type must be "email" or "linkedin".', true)
  }

  const { data: prospect } = await admin
    .from('prospects')
    .select('id, serial')
    .eq('id', args.prospect_id)
    .maybeSingle()
  if (!prospect) return toolText(`No prospect with id ${args.prospect_id}.`, true)

  const { error } = await admin.from('prospect_activity_log').insert({
    prospect_id: prospect.id,
    type: args.type,
    action: 'Note added',
    note: String(args.note).slice(0, 4000),
  })
  if (error) return toolText(`Could not add note: ${error.message}`, true)

  return toolText(`Added a ${args.type} note to ${prospect.serial}.`)
}
