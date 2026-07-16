import Papa from 'papaparse'

// ---------------------------------------------------------------------------
// Generic helpers shared across the import parser modules.
// ---------------------------------------------------------------------------

let _rowSeq = 0
export function nextId() {
  _rowSeq += 1
  return `imp-${_rowSeq}`
}

// Normalize a name for matching: lowercase, trim, collapse internal whitespace.
export function normalizeName(name) {
  return (name ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function splitName(full) {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
  }
}

// Look up a value from a parsed CSV row by trying several possible header
// spellings, case/space-insensitively.
export function pick(row, candidates) {
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
export function snapEnum(value, options, fallback = '') {
  const v = (value ?? '').trim()
  if (!v) return fallback
  const hit = options.find(o => o.toLowerCase() === v.toLowerCase())
  return hit ?? fallback
}

export function parseCsv(text) {
  const { data } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })
  return data
}
