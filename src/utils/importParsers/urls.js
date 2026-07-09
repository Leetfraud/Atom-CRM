// ---------------------------------------------------------------------------
// URL / field extraction — handles markdown link syntax [label](url) properly,
// with bare-URL fallbacks. Validated against the real 954-file Notion export.
// ---------------------------------------------------------------------------

// Extract a URL from a line that may use markdown link syntax [label](url).
// Always prefer the URL inside the parens. Falls back to bare URL scan.
export function extractMarkdownUrl(text) {
  if (!text) return ''
  // Try markdown link: [anything](url)
  const mdMatch = text.match(/\[([^\]]*)\]\(([^)]+)\)/)
  if (mdMatch) return mdMatch[2].trim()
  // Bare URL fallback — exclude brackets and parens from match
  const bareMatch = text.match(/https?:\/\/[^\s\[\]()<>'"]+/)
  if (bareMatch) return bareMatch[0].trim()
  return ''
}

// Extract email from a line, handling [addr](mailto:addr) and bare addresses.
export function extractEmail(text) {
  if (!text) return ''
  // markdown mailto link: [label](mailto:addr)
  const mailtoMatch = text.match(/\[([^\]]*)\]\(mailto:([^)]+)\)/)
  if (mailtoMatch) return mailtoMatch[2].trim()
  // bare email — must not include brackets
  const bareMatch = text.match(/[^\s@|\[\](),<>]+@[^\s@|\[\](),<>]+\.[^\s@|\[\](),<>]+/)
  if (bareMatch) return bareMatch[0].trim()
  return ''
}

// Pull the value that follows a "Label:" prefix on a single line.
export function fieldLine(body, label) {
  const re = new RegExp(`^\\s*(?:[-*]\\s*)?${label}\\s*[:：]\\s*(.+)$`, 'im')
  const m = body.match(re)
  return m ? m[1].trim() : ''
}

// Extract all contact-relevant URLs from a block of text.
export function extractContactFields(text) {
  const out = {}

  const emailLabelled = fieldLine(text, 'Email')
  out.email = extractEmail(emailLabelled || text)

  const liLabelled = fieldLine(text, 'LinkedIn') || fieldLine(text, 'Linkedin')
  const liSource = liLabelled || text
  const liUrl = extractMarkdownUrl(liSource)
  out.linkedin_url = liUrl && /linkedin\.com/i.test(liUrl) ? liUrl : ''

  const ytLabelled = fieldLine(text, 'YouTube') || fieldLine(text, 'Youtube')
  if (ytLabelled && !/^n\/?a$/i.test(ytLabelled.trim())) {
    const ytUrl = extractMarkdownUrl(ytLabelled)
    out.youtube_url = ytUrl && /(youtube\.com|youtu\.be)/i.test(ytUrl) ? ytUrl : ''
  }
  // Fallback: a bare YouTube URL sitting on its own line in the body (no label).
  if (!out.youtube_url) {
    const bareYt = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s\[\]()<>'"]+/i)
    if (bareYt) out.youtube_url = bareYt[0].trim()
  }

  return out
}

// Extract all Gamma doc URLs from a body (there may be more than one).
export function extractGammaUrls(text) {
  const urls = []
  const re = /\[([^\]]*)\]\((https?:\/\/(?:www\.)?gamma\.app\/[^)]+)\)/gi
  let m
  while ((m = re.exec(text)) !== null) {
    urls.push(m[2].trim())
  }
  if (urls.length === 0) {
    // Fallback: bare gamma URLs
    const bareRe = /https?:\/\/(?:www\.)?gamma\.app\/[^\s\[\]()<>'"]+/gi
    while ((m = bareRe.exec(text)) !== null) {
      urls.push(m[0].trim())
    }
  }
  return urls
}

// Flatten [text](url) -> text and [text](mailto:x) -> text, and strip stray
// escape backslashes Notion sometimes emits (e.g. "\\*").
export function flattenMarkdownLinks(text) {
  return (text ?? '')
    .replace(/\[([^\]]*)\]\(mailto:([^)]+)\)/g, '$1')
    .replace(/\[([^\]]*)\]\((?:https?:\/\/)?[^)]+\)/g, '$1')
    // Orphaned fragments from URLs broken across a stray newline in the source,
    // e.g. a leftover "...com/](https://.../))" half. Strip the ](url) tail.
    .replace(/\]\((?:https?:\/\/)?[^)]*\)\)?/g, '')
    // Leftover opening "[https://foo" with no closing bracket on its own.
    .replace(/\[(https?:\/\/[^\]\s]*)$/gm, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/\\+\*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
