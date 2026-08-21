// ---------------------------------------------------------------------------
// Import parsers — orchestration + public API.
//
// This module ties together the focused sub-modules (shared / urls / title /
// notes) and exposes the same surface the rest of the app imports, so splitting
// the original single file changed nothing for consumers.
//
// Validated end-to-end against the real 954-file Notion email-pipeline export.
//
// Email contacts arrive by one of two routes — a downloaded zip, or a live pull
// from the Notion API — and both converge on buildEmailContact(). Everything
// downstream of that (matching, review rows, commit) is route-agnostic.
// ---------------------------------------------------------------------------

import {
  nextId,
  normalizeName,
  splitName,
  pick,
  snapEnum,
  parseCsv,
} from './shared.js'
import {
  extractContactFields,
  extractGammaUrls,
  extractEmail,
  extractMarkdownUrl,
} from './urls.js'
import {
  parseTitle,
  companyFromGammaSlug,
  titleFromFilename,
  titleFromBody,
} from './title.js'
import { buildNotes, extractSecondaryContactText } from './notes.js'
import { pageProperties, pageTitle } from '../notion/properties.js'

import {
  EMAIL_PIPELINE_STAGES,
  LINKEDIN_CONNECTION_STATUSES,
  LINKEDIN_DM_STATUSES,
} from '../constants'

// Re-export the helpers other modules/components import directly from here.
export { normalizeName, parseCsv } from './shared.js'
export { titleFromFilename, titleFromBody } from './title.js'

// LinkedIn Connections Tracker - clean structured table.
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

const EMPTY_META = { name: '', stage: '', tags: [], linkedinRequest: false }

// Read the pipeline fields out of one flat { column: value } record.
//
// Both import routes end up here: the zip path passes a parsed CSV row, the
// live path passes a Notion page's properties flattened to strings. Sharing it
// means a database whose column is called "Label" rather than "Tags" behaves
// the same whichever way the data arrived.
function metaFromRecord(record) {
  const tagsRaw = pick(record, ['Label', 'Labels', 'Tags'])
  const linkedinRequest = pick(record, ['LinkedIn Request', 'Linkedin Request'])
  return {
    name: pick(record, ['Name', 'Title', 'Page']),
    stage: snapEnum(pick(record, ['Status', 'Stage']), EMAIL_PIPELINE_STAGES),
    tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
    linkedinRequest: linkedinRequest.toLowerCase() === 'yes',
  }
}

// Everything Notion stores as a page property lives in the CSV.
function buildEmailCsvIndex(csvText) {
  const index = new Map()
  if (!csvText) return index
  for (const row of parseCsv(csvText)) {
    const meta = metaFromRecord(row)
    if (!meta.name) continue
    index.set(normalizeName(meta.name), meta)
  }
  return index
}

// Turn one page — a title, its body as markdown, and its pipeline properties —
// into a single email contact.
//
// This is the whole of the email-side parsing, and it is deliberately unaware
// of where the page came from. The zip path reconstructs the arguments from a
// .md file plus a CSV row; the live path gets them from the Notion API and
// renders blocks back to the same markdown dialect. Neither gets its own
// interpretation of a title, a checklist, or a Gamma link.
function buildEmailContact(title, body, meta) {
  const parsed = parseTitle(title)

  let firstName = '', lastName = '', company = '', needsName = false
  let secondaryNoteLines = []

  if (parsed.isPlaceholder) {
    // No name — extract email or linkedin from the placeholder value
    needsName = true
    // company stays blank
  } else {
    const nameParts = splitName(parsed.primaryName)
    firstName = nameParts.first_name
    lastName = nameParts.last_name
    company = parsed.company

    // Secondary names from multi-name title go into notes
    if (parsed.secondaryNames.length > 0) {
      secondaryNoteLines.push(
        ...parsed.secondaryNames.map(n => `Additional person in title: ${n}`)
      )
    }
  }

  // Extract primary contact's fields from the body
  const primaryFields = extractContactFields(body)
  const gammaUrls = extractGammaUrls(body)
  const gammaDocUrl = gammaUrls[0] ?? ''

  // For placeholder titles, try to get email/linkedin from the placeholder value itself
  if (parsed.isPlaceholder) {
    if (parsed.placeholderType === 'email') {
      primaryFields.email = primaryFields.email || extractEmail(parsed.placeholderValue)
    } else if (parsed.placeholderType === 'linkedin') {
      primaryFields.linkedin_url = primaryFields.linkedin_url || extractMarkdownUrl(parsed.placeholderValue)
    }
  }

  // Company fallback from Gamma slug
  if (!company && gammaDocUrl) {
    company = companyFromGammaSlug(gammaDocUrl, firstName, lastName)
  }

  // Build secondary contact text from body (any lines with role-like labels pointing to other people)
  // We do NOT try to parse these into structured rows — just preserve the raw text
  const secondaryContactText = extractSecondaryContactText(body, secondaryNoteLines)

  const notes = buildNotes(body, parsed.secondaryNames, secondaryContactText)

  return {
    _key: nextId(),
    source: 'email',
    name: parsed.isPlaceholder ? '' : (parsed.primaryName || title),
    first_name: firstName,
    last_name: lastName,
    role_title: '',
    company,
    email: primaryFields.email ?? '',
    linkedin_url: primaryFields.linkedin_url ?? '',
    youtube_url: primaryFields.youtube_url ?? '',
    gamma_doc_url: gammaDocUrl,
    email_stage: meta.stage,
    tags: [...meta.tags],
    notes: [
      gammaUrls.length > 1 ? `Additional Gamma docs: ${gammaUrls.slice(1).join(', ')}` : '',
      notes,
    ].filter(Boolean).join('\n'),
    needsName,
    _linkedinRequest: meta.linkedinRequest,
  }
}

// Zip / folder path. mdFiles: [{ name, content }]. One prospect per file.
export function parseEmailExport(csvText, mdFiles) {
  const csvIndex = buildEmailCsvIndex(csvText)

  return (mdFiles ?? []).map(file => {
    const body = file.content ?? ''
    const filenameTitle = titleFromFilename(file.name)
    // Prefer the in-file "# heading" (keeps colons the filename strips), but
    // match against the CSV by the filename-derived title since that's what the
    // CSV "Name" column corresponds to.
    const fileTitle = titleFromBody(body, filenameTitle)
    const meta = csvIndex.get(normalizeName(filenameTitle))
      ?? csvIndex.get(normalizeName(fileTitle))
      ?? EMPTY_META

    return buildEmailContact(fileTitle, body, meta)
  })
}

// Live path. pages: [{ id, url, properties, markdown }] straight off the Notion
// API, where `properties` is the raw property map and `markdown` is the body
// rendered by blocksToMarkdown.
//
// Two things are strictly better here than in the zip path: the title comes
// from the title property rather than a filename that has had its punctuation
// stripped and a hash appended, and the properties never had to survive a round
// trip through CSV. A page whose body failed to load still yields a contact
// built from its properties alone.
export function parseNotionPages(pages) {
  return (pages ?? []).map(page => {
    const record = pageProperties(page)
    const meta = metaFromRecord(record)
    const title = pageTitle(page) || meta.name
    const contact = buildEmailContact(title, page.markdown ?? '', meta)

    // Carried through to the review row and stored on the prospect, so a later
    // re-run of this import updates the same person instead of adding a twin.
    contact._notionPageId = page.id ?? ''
    contact._notionLastEditedAt = page.last_edited_time ?? null
    return contact
  })
}

// --- Matching + review row construction ---

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
    needsName: false,
    notion_page_id: null,
    notion_last_edited_at: null,
    // Set once the commit step has resolved this page against the database;
    // drives the "Update" badge on the review screen.
    _existingId: null,
    _liKey: null,
    _emailKey: null,
  }
}

function mergeNotes(a, b) {
  return [a, b].map(s => (s ?? '').trim()).filter(Boolean).join('\n')
}

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
  row.needsName = em?.needsName ?? false

  // Only the email side can carry a Notion identity; a LinkedIn CSV row has no
  // page behind it.
  row.notion_page_id = em?._notionPageId || null
  row.notion_last_edited_at = em?._notionLastEditedAt || null
  return row
}

// Match LinkedIn rows against email contacts by exact normalized name.
// Only email contacts with _linkedinRequest: true are eligible for matching.
export function buildReviewRows(linkedinContacts, emailContacts) {
  // Only attempt matching for email contacts that had "LinkedIn Request: Yes"
  const emailByName = new Map()
  for (const em of emailContacts) {
    if (!em._linkedinRequest) continue
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

  // All email contacts that weren't matched
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
  // _existingId is stamped when the rows are built from a Notion pull, so the
  // review screen can say how many of these are updates rather than new people.
  const updates = active.filter(r => r._existingId).length
  return {
    matched,
    linkedin,
    email,
    updates,
    creates: active.length - updates,
    total: active.length,
  }
}

// Mark the rows whose Notion page already exists as a prospect.
// syncState: the Map returned by fetchNotionSyncState — page id -> { prospectId }.
//
// This only drives the review UI. The commit re-resolves identity against the
// database at write time, so a stale badge here cannot cause a duplicate.
export function markExistingRows(rows, syncState) {
  if (!syncState?.size) return rows
  return rows.map(row => {
    const existingId = row.notion_page_id
      ? syncState.get(row.notion_page_id)?.prospectId ?? null
      : null
    return existingId === row._existingId ? row : { ...row, _existingId: existingId }
  })
}

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
    needsName: row.needsName,
    // Without these the re-pair would drop the page identity and the row would
    // come back as a fresh insert on commit.
    _notionPageId: row.notion_page_id,
    _notionLastEditedAt: row.notion_last_edited_at,
  }
}
