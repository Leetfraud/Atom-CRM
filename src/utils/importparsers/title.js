import { splitName } from './shared.js'

// ---------------------------------------------------------------------------
// Title parsing — multi-name titles, placeholder titles, and company-from-slug.
// Validated against the real Notion export (heading line vs filename, bare
// email/URL titles, "Name1 , Name2 - Company" shapes).
// ---------------------------------------------------------------------------

// Parse a Notion page title into primary name, optional secondary names, and company.
// Cases:
//   "Victor Godsk , Andreas Andersen - Obzia"  -> primary=Victor Godsk, secondary=[Andreas Andersen], company=Obzia
//   "Email: person@x.com (apollo)"             -> placeholder, no name
//   "LinkedIn: https://linkedin.com/in/..."    -> placeholder, no name
//   "Jane Doe - Acme Corp"                     -> primary=Jane Doe, company=Acme Corp
//   "Jane Doe"                                 -> primary=Jane Doe
export function parseTitle(title) {
  const raw = (title ?? '').trim()

  // Placeholder titles: starts with "Email:" or "LinkedIn:"
  const placeholderMatch = raw.match(/^(Email|LinkedIn)\s*[:：]\s*(.+)$/i)
  if (placeholderMatch) {
    return {
      isPlaceholder: true,
      placeholderType: placeholderMatch[1].toLowerCase(),
      placeholderValue: placeholderMatch[2].trim(),
      primaryName: '',
      secondaryNames: [],
      company: '',
    }
  }

  // Bare-email title, e.g. "bronagh@vroomdigital.ie" (no "Email:" prefix)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return {
      isPlaceholder: true,
      placeholderType: 'email',
      placeholderValue: raw,
      primaryName: '',
      secondaryNames: [],
      company: '',
    }
  }

  // Bare-URL title, e.g. "https://www.linkedin.com/in/..."
  if (/^https?:\/\//i.test(raw)) {
    return {
      isPlaceholder: true,
      placeholderType: /linkedin\.com/i.test(raw) ? 'linkedin' : 'url',
      placeholderValue: raw,
      primaryName: '',
      secondaryNames: [],
      company: '',
    }
  }

  // Split off company suffix: "Names - Company"
  // Use " - " (space-dash-space) to avoid splitting hyphenated names
  const companySplit = raw.split(/\s+-\s+/)
  const namesPart = companySplit[0].trim()
  const company = companySplit.length > 1 ? companySplit.slice(1).join(' - ').trim() : ''

  // Split multiple names by comma
  const names = namesPart.split(',').map(s => s.trim()).filter(Boolean)

  return {
    isPlaceholder: false,
    primaryName: names[0] ?? '',
    secondaryNames: names.slice(1),
    company,
  }
}

// Attempt to extract company from a Gamma doc slug as a fallback.
// Pattern: "FirstName-LastName-Company-Name-D100-Doc-hash"
export function companyFromGammaSlug(gammaUrl, firstName, lastName) {
  if (!gammaUrl) return ''
  try {
    const url = new URL(gammaUrl)
    const slug = url.pathname.split('/').pop() ?? ''
    const d100idx = slug.indexOf('-D100')
    if (d100idx === -1) return ''
    const namePart = slug.slice(0, d100idx)
    // Remove the person's own name from the front (first + last, dashes)
    const personSlug = [firstName, lastName]
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/\s+/g, '-')
    const lowerSlug = namePart.toLowerCase()
    if (!lowerSlug.startsWith(personSlug)) return ''
    const remainder = namePart.slice(personSlug.length).replace(/^-/, '')
    if (!remainder) return ''
    // Title-case the remainder (split on dash)
    return remainder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  } catch {
    return ''
  }
}

// Notion filenames get a hash suffix. Strip it.
export function titleFromFilename(filename) {
  let base = filename.replace(/\.md$/i, '')
  base = base.replace(/\s+[0-9a-f]{32}$/i, '')
  return base.trim()
}

// The real Notion title lives in the first "# heading" line of the body, which
// preserves punctuation (colons, etc.) that the FILENAME strips. Prefer the

// The real Notion title lives in the first "# heading" line of the body, which
// preserves punctuation (colons, etc.) that the FILENAME strips. Prefer the
// heading; fall back to the filename-derived title if there is no heading.
export function titleFromBody(body, fallback) {
  const m = (body ?? '').match(/^\s*#\s+(.+)$/m)
  if (m) return m[1].trim()
  return fallback
}

