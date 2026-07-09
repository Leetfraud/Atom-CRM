import { flattenMarkdownLinks } from './urls.js'

// ---------------------------------------------------------------------------
// Notes assembly - strips property-block lines, summarizes the checklist,
// delimits the Answers section, and folds secondary-contact mentions into
// readable text. Validated against the real export.
// ---------------------------------------------------------------------------

// Lines to strip entirely from notes (property-block lines, known field labels).
const STRIP_LINE_RE = /^(linkedin\s*(request)?|email|gamma|youtube|twitter|instagram|status|label|labels|assign|due|attachments|website|script|twt|twitter|note|linkedin\s*request|serial|name|company|role|title|place)\s*[:：]/i

// Summarize a checklist into a single line, e.g. "Checklist: 4/5 checked"
function summarizeChecklist(lines) {
  const checklistLines = lines.filter(l => /^\[[ xX]\]/.test(l.replace(/^[-*]\s*/, '')))
  if (checklistLines.length === 0) return null
  const checked = checklistLines.filter(l => /^\[[xX]\]/.test(l.replace(/^[-*]\s*/, ''))).length
  const missing = checklistLines
    .filter(l => /^\[ \]/.test(l.replace(/^[-*]\s*/, '')))
    .map(l => l.replace(/^[-*]?\s*\[[ xX]\]\s*/, '').replace(/\*\*/g, '').trim())
  const missingStr = missing.length ? ` (missing: ${missing.join(', ')})` : ''
  return `Checklist: ${checked}/${checklistLines.length} checked${missingStr}`
}

// A line is a "secondary contact" line if it has a role-like label followed by
// a value that carries an email or LinkedIn URL. Shared by buildNotes (to skip
// them) and extractSecondaryContactText (to collect them) so they never
// disagree or duplicate.
// Labels that belong to the PRIMARY contact's own property block — a line
// starting with one of these is never a "secondary person", it's the main

// Labels that belong to the primary contact's own property block.
const PRIMARY_FIELD_LABELS = new Set([
  'email', 'linkedin', 'linkedin request', 'gamma', 'youtube', 'website',
  'twitter', 'twt', 'instagram', 'status', 'label', 'labels', 'assign',
  'due', 'attachments', 'note', 'script', 'name', 'company', 'role', 'title',
  'place', 'serial',
])


// A line is a secondary-contact line if it has a role-like label followed by
// a value carrying an email or LinkedIn URL.
function isSecondaryContactLine(cleanLine) {
  const m = cleanLine.match(/^([^:：]{2,40})[:：]\s*(.+)$/)
  if (!m) return false
  const key = m[1].trim()
  if (!looksLikeRoleLabel(key)) return false
  // Must NOT be one of the primary's own field labels.
  if (PRIMARY_FIELD_LABELS.has(key.toLowerCase())) return false
  const value = m[2].trim()
  const hasEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)
  const hasLinkedIn = /linkedin\.com/i.test(value)
  return hasEmail || hasLinkedIn
}


// Build the final notes string for a primary contact from the raw body.
export function buildNotes(body, secondaryNames, secondaryContactText) {
  const lines = body.split('\n')
  const noteLines = []
  const checklistRaw = []
  let inAnswers = false
  let answersLines = []

  for (const raw of lines) {
    // Strip list markers and bold, trim
    const line = raw.replace(/^[\s]*[-*]\s*/, '').replace(/\*\*/g, '').replace(/^\*+|\*+$/g, '').trim()
    if (!line) continue

    // Skip the title line (starts with #)
    if (/^#+\s/.test(line)) continue

    // Skip separator lines (____ or ---- runs)
    if (/^[_\-—–]{3,}$/.test(line)) continue

    // Skip secondary-contact lines — those go into secondaryContactText instead
    if (isSecondaryContactLine(line)) continue

    // Skip known property-block lines
    if (STRIP_LINE_RE.test(line)) {
      // "Note:" lines: extract and keep the value, not the label
      const noteValueMatch = line.match(/^note\s*[:：]\s*(.+)$/i)
      if (noteValueMatch) noteLines.push(noteValueMatch[1].trim())
      continue
    }

    // Collect Answers section separately
    if (/^answers?\s*[:：]?\s*$/i.test(line)) {
      inAnswers = true
      continue
    }
    if (inAnswers) {
      // End answers on next major section heading or known property
      if (/^#{1,3}\s/.test(line) || STRIP_LINE_RE.test(line)) {
        inAnswers = false
      } else {
        answersLines.push(line)
        continue
      }
    }

    // Collect checklist lines separately
    if (/^\[[ xX]\]/.test(line)) {
      checklistRaw.push(line)
      continue
    }

    // Skip lines that are just URLs already captured as fields
    if (/^https?:\/\//i.test(line)) continue
    // A line that is ONLY a markdown link (optionally wrapped in parens) is a
    // bare URL echo — skip it.
    if (/^\(?\[[^\]]*\]\(https?:\/\/[^)]+\)\)?$/.test(line)) continue

    // Otherwise flatten any inline markdown links so no raw []() syntax leaks
    // into notes: keep the link TEXT (more human-readable than the URL here).
    const flattened = line
      .replace(/\[([^\]]*)\]\(mailto:([^)]+)\)/g, '$1')
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '$1')
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (flattened) noteLines.push(flattened)
  }

  const parts = []

  if (noteLines.length) parts.push(noteLines.join('\n'))

  const checklistSummary = summarizeChecklist(checklistRaw)
  if (checklistSummary) parts.push(checklistSummary)

  if (answersLines.length) {
    parts.push(`--- Answers ---\n${answersLines.join('\n')}\n--- End Answers ---`)
  }

  if (secondaryContactText) {
    parts.push(`--- Other contacts mentioned on this page ---\n${secondaryContactText}`)
  }

  // Final safety net: flatten ANY residual markdown links anywhere in the notes
  // (including inside Answers prose or mid-sentence), keeping readable text.
  const joined = parts.filter(Boolean).join('\n\n')
  return flattenMarkdownLinks(joined)
}

// Flatten [text](url) → text and [text](mailto:x) → text, and strip stray

export function extractSecondaryContactText(body, extraLines) {
  const secondaryLines = [...extraLines]

  for (const raw of body.split('\n')) {
    // Strip list markers, bold, and stray leading/trailing asterisks
    const line = raw
      .replace(/^[\s]*[-*]\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/^\*+|\*+$/g, '')
      .trim()
    if (!line) continue
    if (/^#+\s/.test(line)) continue // skip headings

    if (!isSecondaryContactLine(line)) continue

    // Flatten any markdown links in the value into readable text:
    //   [andy@obzia.com](mailto:andy@obzia.com) -> andy@obzia.com
    //   [https://linkedin.com/in/x](https://linkedin.com/in/x) -> https://linkedin.com/in/x
    const cleaned = line
      .replace(/\[([^\]]*)\]\(mailto:([^)]+)\)/g, '$2')
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '$2')
      // collapse leftover empty parens and excess whitespace
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    secondaryLines.push(cleaned)
  }

  return secondaryLines.length ? secondaryLines.join('\n') : ''
}

function looksLikeRoleLabel(key) {
  if (key.length < 2 || key.length > 40) return false
  if (/https?:|www\.|[\[\]{}<>]/i.test(key)) return false
  if (!/^[A-Za-z][A-Za-z\s&/.'"-]*$/.test(key)) return false
  return true
}
