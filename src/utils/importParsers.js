import Papa from 'papaparse'
import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES,
} from './constants'

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

let _rowSeq = 0
function nextId() {
  _rowSeq += 1
  return `imp-${_rowSeq}`
}

// Normalize a name for matching: lowercase, trim, collapse internal whitespace.
export function normalizeName(name) {
  return (name ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function splitName(full) {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
  }
}

// Look up a value from a parsed CSV row by trying several possible header
// spellings, case/space-insensitively. Notion headers aren't always stable.
function pick(row, candidates) {
  const keys = Object.keys(row)
  for (const cand of candidates) {
    const norm = cand.toLowerCase().replace(/\s+/g, '')
    const hit = keys.find(k => k.toLowerCase().replace(/\s+/g, '') === norm)
    if (hit && row[hit] != null && String(row[hit]).trim() !== '') {
      return String(row[hit]).trim()
    }
  }
  return ''
}

// Snap a free-text value onto one of the known enum options (case-insensitive).
// Returns the canonical option if found, otherwise the original trimmed value
// (so the review screen can surface anything unexpected for manual fixing).
function snapEnum(value, options) {
  const v = (value ?? '').trim()
  if (!v) return ''
  const hit = options.find(o => o.toLowerCase() === v.toLowerCase())
  return hit ?? v
}

const URL_RE = {
  linkedin: /(https?:\/\/)?([\w.-]+\.)?linkedin\.com\/[^\s)|,]+/i,
  gamma: /(https?:\/\/)?(www\.)?gamma\.app\/[^\s)|,]+/gi,
  youtube: /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/[^\s)|,]+/i,
  email: /[^\s@|,()<>]+@[^\s@|,()<>]+\.[^\s@|,()<>]+/,
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

export function parseCsv(text) {
  const { data } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })
  return data
}

// LinkedIn Connections Tracker — a clean structured table where every field is
// already a real column.
export function parseLinkedinCsv(text) {
  const rows = parseCsv(text)
  return rows
    .map(row => {
      const name = pick(row, ['Name', 'Full Name', 'Contact'])
      if (!name) return null
      const { first_name, last_name } = splitName(name)
      return {
        _key: nextId(),
        source: 'linkedin',
        name,
        first_name,
        last_name,
        serial: pick(row, ['Serial', 'Lead', 'ID']),
        company: pick(row, ['Company', 'Organization']),
        role_title: pick(row, ['Role / Title', 'Role/Title', 'Role', 'Title']),
        linkedin_url: pick(row, ['LinkedIn URL', 'LinkedIn', 'LinkedIn Url', 'Profile']),
        place: pick(row, ['Place', 'Location']),
        connection_status: snapEnum(
          pick(row, ['Connection Status', 'Connection']),
          LINKEDIN_CONNECTION_STATUSES
        ),
        dm_status: snapEnum(pick(row, ['DM Status', 'DM']), LINKEDIN_DM_STATUSES),
        connection_sent_at: pick(row, ['Request Sent', 'Request Sent Date', 'Sent']),
        last_action_date: pick(row, ['Last Action Date', 'Last Action']),
        notes: pick(row, ['Notes', 'Note']),
      }
    })
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Email export parsing (CSV properties + one .md file per page)
// ---------------------------------------------------------------------------

// Notion filenames get a hash suffix, e.g. "Jane Doe 1a2b3c4d....md".
// Strip the extension and the trailing 32-hex-char Notion id (if present).
export function titleFromFilename(filename) {
  let base = filename.replace(/\.md$/i, '')
  base = base.replace(/\s+[0-9a-f]{32}$/i, '')
  return base.trim()
}

// Pull the value that follows a "Label:" prefix on a single line.
function fieldLine(body, label) {
  const re = new RegExp(`^\\s*(?:[-*]\\s*)?${label}\\s*[:：]\\s*(.+)$`, 'im')
  const m = body.match(re)
  return m ? m[1].trim() : ''
}

function firstMatch(text, re) {
  const m = text.match(re)
  return m ? m[0].trim() : ''
}

// Extract a contact-worth of fields from a block of free text (either the whole
// page body for the primary contact, or the value portion of an additional
// contact line).
function extractContactFields(text) {
  const out = {}

  const emailLabelled = fieldLine(text, 'Email')
  out.email = firstMatch(emailLabelled || text, URL_RE.email)

  const liLabelled = fieldLine(text, 'LinkedIn') || fieldLine(text, 'Linkedin')
  out.linkedin_url = firstMatch(liLabelled || text, URL_RE.linkedin)

  const yt = fieldLine(text, 'YouTube') || fieldLine(text, 'Youtube')
  if (yt && !/^n\/?a$/i.test(yt.trim())) {
    out.youtube_url = firstMatch(yt, URL_RE.youtube) || firstMatch(text, URL_RE.youtube)
  } else if (!yt) {
    out.youtube_url = firstMatch(text, URL_RE.youtube)
  }

  return out
}

const KNOWN_FIELD_KEYS = new Set([
  'email', 'linkedin', 'gamma', 'youtube', 'twitter', 'instagram',
  'status', 'label', 'labels', 'tags', 'assign', 'attachments', 'name',
  'company', 'role', 'title', 'notes', 'linkedin request',
])

// Detect additional-contact blocks like:
//   "Director of Marketing: Jane Doe — Email: jane@x.com"
//   "MD: John Roe (linkedin.com/in/johnroe)"
// A line qualifies when its key isn't a known field key and its value carries a
// name plus an email or LinkedIn URL.
function extractAdditionalContacts(body) {
  const contacts = []
  const lines = body.split('\n')
  for (const raw of lines) {
    const line = raw.replace(/^\s*[-*]\s*/, '').trim()
    const m = line.match(/^([^:：]{2,60})[:：]\s*(.+)$/)
    if (!m) continue
    const key = m[1].trim().toLowerCase()
    if (KNOWN_FIELD_KEYS.has(key)) continue
    const value = m[2].trim()
    const hasEmail = URL_RE.email.test(value)
    const hasLi = URL_RE.linkedin.test(value)
    if (!hasEmail && !hasLi) continue

    // Name = leading text before the first delimiter / URL / "Email:".
    const nameRaw = value
      .split(/\s+[—–-]\s+|\(|,|\bEmail\b|\bLinkedIn\b/i)[0]
      .trim()
    if (!nameRaw || nameRaw.length > 60) continue

    const fields = extractContactFields(value)
    contacts.push({
      role_title: m[1].trim(),
      name: nameRaw,
      ...splitName(nameRaw),
      ...fields,
      _raw: line,
    })
  }
  return contacts
}

// Everything Notion stores as a page property lives in the CSV, keyed by page
// title. Build a lookup of title -> { stage, tags }.
function buildEmailCsvIndex(csvText) {
  const index = new Map()
  if (!csvText) return index
  const rows = parseCsv(csvText)
  for (const row of rows) {
    const name = pick(row, ['Name', 'Title', 'Page'])
    if (!name) continue
    const tagsRaw = pick(row, ['Label', 'Labels', 'Tags'])
    const tags = tagsRaw
      ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
      : []
    index.set(normalizeName(name), {
      name,
      stage: snapEnum(pick(row, ['Status', 'Stage']), EMAIL_PIPELINE_STAGES),
      tags,
    })
  }
  return index
}

// mdFiles: [{ name, content }]. csvText: the property CSV (optional but
// expected). Returns a flat list of email-sourced contacts (primary + split-out
// additional contacts), each carrying the page-level stage + tags.
export function parseEmailExport(csvText, mdFiles) {
  const csvIndex = buildEmailCsvIndex(csvText)
  const contacts = []

  for (const file of mdFiles ?? []) {
    const title = titleFromFilename(file.name)
    const body = file.content ?? ''
    const meta = csvIndex.get(normalizeName(title)) ?? { stage: '', tags: [] }

    // Split out additional contacts first, then strip their lines so the primary
    // contact's field scan can't accidentally grab an additional contact's URL.
    const additional = extractAdditionalContacts(body)
    const additionalLines = new Set(additional.map(c => c._raw))
    const primaryBody = body
      .split('\n')
      .filter(l => !additionalLines.has(l.replace(/^\s*[-*]\s*/, '').trim()))
      .join('\n')

    const gammaLinks = primaryBody.match(URL_RE.gamma) ?? []
    const primaryFields = extractContactFields(primaryBody)

    // Leftover body → notes: drop lines we recognized as fields/links.
    const noteLines = primaryBody
      .split('\n')
      .map(l => l.replace(/^\s*[-*]\s*/, '').trim())
      .filter(Boolean)
      .filter(l =>
        !/^(email|linkedin|gamma|youtube|twitter|instagram|status|label|assign|attachments)\s*[:：]/i.test(l) &&
        !URL_RE.linkedin.test(l) &&
        !URL_RE.email.test(l) &&
        !/gamma\.app/i.test(l) &&
        !/youtube\.com|youtu\.be/i.test(l)
      )

    contacts.push({
      _key: nextId(),
      source: 'email',
      name: title,
      ...splitName(title),
      role_title: '',
      company: '',
      email: primaryFields.email ?? '',
      linkedin_url: primaryFields.linkedin_url ?? '',
      youtube_url: primaryFields.youtube_url ?? '',
      gamma_doc_url: gammaLinks[0] ?? '',
      // Extra gamma links (beyond the primary) — flagged in notes until we see
      // real data and decide on a dedicated field.
      email_stage: meta.stage,
      tags: [...meta.tags],
      notes: [
        gammaLinks.length > 1 ? `Additional Gamma docs: ${gammaLinks.slice(1).join(', ')}` : '',
        noteLines.join('\n'),
      ].filter(Boolean).join('\n'),
    })

    // Additional contacts inherit the page's stage + tags but keep their own
    // identity/links.
    for (const extra of extractAdditionalContacts(body)) {
      contacts.push({
        _key: nextId(),
        source: 'email',
        name: extra.name,
        first_name: extra.first_name,
        last_name: extra.last_name,
        role_title: extra.role_title ?? '',
        company: '',
        email: extra.email ?? '',
        linkedin_url: extra.linkedin_url ?? '',
        youtube_url: '',
        gamma_doc_url: '',
        email_stage: meta.stage,
        tags: [...meta.tags],
        notes: `Additional contact at ${title}`,
      })
    }
  }

  return contacts
}

// ---------------------------------------------------------------------------
// Matching + review row construction
// ---------------------------------------------------------------------------

// An empty, fully-shaped review row used as the merge target.
function blankRow() {
  return {
    id: nextId(),
    included: true,
    source: 'linkedin',
    serial: '',
    first_name: '',
    last_name: '',
    company: '',
    role_title: '',
    email: '',
    linkedin_url: '',
    company_url: '',
    gamma_doc_url: '',
    youtube_url: '',
    place: '',
    notes: '',
    email_stage: 'Prospects',
    connection_status: 'Pending',
    dm_status: 'Not Sent',
    tags: [],
    _liKey: null,
    _emailKey: null,
  }
}

function mergeNotes(a, b) {
  return [a, b].map(s => (s ?? '').trim()).filter(Boolean).join('\n')
}

// Build a merged review row from an optional LinkedIn contact + optional email
// contact. LinkedIn wins on identity/company/place/LI status; email wins on
// email/gamma/youtube/stage. Tags come from the email side.
function mergeRow(li, em) {
  const row = blankRow()
  row.source = li && em ? 'matched' : li ? 'linkedin' : 'email'
  row._liKey = li?._key ?? null
  row._emailKey = em?._key ?? null

  row.first_name = li?.first_name || em?.first_name || ''
  row.last_name = li?.last_name || em?.last_name || ''
  row.company = li?.company || em?.company || ''
  row.role_title = li?.role_title || em?.role_title || ''
  row.place = li?.place || ''
  row.serial = li?.serial || ''

  row.email = em?.email || ''
  row.linkedin_url = li?.linkedin_url || em?.linkedin_url || ''
  row.gamma_doc_url = em?.gamma_doc_url || ''
  row.youtube_url = em?.youtube_url || ''

  row.email_stage = em?.email_stage || 'Prospects'
  row.connection_status = li?.connection_status || 'Pending'
  row.dm_status = li?.dm_status || 'Not Sent'
  row.connection_sent_at = li?.connection_sent_at || ''
  row.last_action_date = li?.last_action_date || ''

  row.tags = em?.tags ? [...em.tags] : []
  row.notes = mergeNotes(li?.notes, em?.notes)
  return row
}

// Match LinkedIn rows against email contacts by exact normalized name. No fuzzy
// matching — too risky for silent data corruption. Every contact from either
// source becomes a review row.
export function buildReviewRows(linkedinContacts, emailContacts) {
  const emailByName = new Map()
  for (const em of emailContacts) {
    const key = normalizeName(em.name)
    if (!key) continue
    if (!emailByName.has(key)) emailByName.set(key, [])
    emailByName.get(key).push(em)
  }

  const usedEmailKeys = new Set()
  const rows = []

  for (const li of linkedinContacts) {
    const bucket = emailByName.get(normalizeName(li.name)) ?? []
    const match = bucket.find(em => !usedEmailKeys.has(em._key))
    if (match) usedEmailKeys.add(match._key)
    rows.push(mergeRow(li, match ?? null))
  }

  // Email contacts that never matched a LinkedIn row.
  for (const em of emailContacts) {
    if (usedEmailKeys.has(em._key)) continue
    rows.push(mergeRow(null, em))
  }

  return rows
}

export function summarize(rows) {
  const active = rows.filter(r => r.included)
  const matched = active.filter(r => r.source === 'matched').length
  const linkedin = active.filter(r => r.source === 'linkedin').length
  const email = active.filter(r => r.source === 'email').length
  return { matched, linkedin, email, total: active.length }
}

// Re-pair two currently-unmatched rows (one LinkedIn-only, one email-only) into
// a single matched row. Returns a new rows array.
export function repairRows(rows, liRowId, emailRowId) {
  const liRow = rows.find(r => r.id === liRowId)
  const emailRow = rows.find(r => r.id === emailRowId)
  if (!liRow || !emailRow) return rows

  const merged = mergeRow(
    { _key: liRow._liKey, ...liRowToContact(liRow) },
    { _key: emailRow._emailKey, ...emailRowToContact(emailRow) }
  )
  merged.id = liRow.id
  merged.included = liRow.included

  return rows
    .filter(r => r.id !== emailRowId)
    .map(r => (r.id === liRowId ? merged : r))
}

// Reconstruct contact-shaped objects from an edited review row so re-pairing
// preserves any manual edits the user already made.
function liRowToContact(row) {
  return {
    first_name: row.first_name,
    last_name: row.last_name,
    company: row.company,
    role_title: row.role_title,
    linkedin_url: row.linkedin_url,
    place: row.place,
    serial: row.serial,
    connection_status: row.connection_status,
    dm_status: row.dm_status,
    connection_sent_at: row.connection_sent_at,
    last_action_date: row.last_action_date,
    notes: row.notes,
  }
}

function emailRowToContact(row) {
  return {
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    linkedin_url: row.linkedin_url,
    gamma_doc_url: row.gamma_doc_url,
    youtube_url: row.youtube_url,
    email_stage: row.email_stage,
    tags: row.tags,
  }
}
