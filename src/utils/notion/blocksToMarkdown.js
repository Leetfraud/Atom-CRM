// ---------------------------------------------------------------------------
// Notion block tree -> markdown.
//
// The import parsers in ../importParsers were validated against the real 954-
// file "Export -> Markdown & CSV" output. Rather than write a second parser for
// the API shape, the live path renders blocks back into that same markdown
// dialect and feeds the existing, proven pipeline.
//
// So the target here is not "nice markdown", it is *Notion's export markdown*:
//   - links as [text](url), bold as **text**
//   - to-dos as "- [x] label" / "- [ ] label"
//   - property lines as "Label: value"
// Anything that drifts from that silently degrades notes/URL extraction.
// ---------------------------------------------------------------------------

// A rich_text run, trimmed server-side to { plain_text, href?, bold?, ... }.
function renderRichText(rich) {
  return (rich ?? [])
    .map(run => {
      let text = run.plain_text ?? ''
      if (!text) return ''
      // Order matters: code innermost, then emphasis, then the link wrapper,
      // so a bold link renders as [**text**](url) the way Notion exports it.
      if (run.code) text = `\`${text}\``
      if (run.bold) text = `**${text}**`
      if (run.italic) text = `*${text}*`
      if (run.strikethrough) text = `~~${text}~~`
      if (run.href) text = `[${text}](${run.href})`
      return text
    })
    .join('')
}

function indent(text, depth) {
  if (!depth) return text
  const pad = '    '.repeat(depth)
  return text.split('\n').map(line => (line ? pad + line : line)).join('\n')
}

// Notion numbers each run of sibling numbered_list_item blocks from 1, so the
// counter resets whenever a different block type interrupts the run.
function renderBlock(block, ctx) {
  const text = renderRichText(block.rich_text)

  switch (block.type) {
    case 'heading_1':
      return `# ${text}`
    case 'heading_2':
      return `## ${text}`
    case 'heading_3':
      return `### ${text}`

    case 'bulleted_list_item':
    case 'toggle':
      return `- ${text}`

    case 'numbered_list_item':
      return `${ctx.counter}. ${text}`

    case 'to_do':
      return `- [${block.checked ? 'x' : ' '}] ${text}`

    case 'quote':
      return `> ${text}`

    case 'callout':
      return text

    case 'code':
      return `\`\`\`${block.language ?? ''}\n${text}\n\`\`\``

    case 'divider':
      return '---'

    case 'child_page':
    case 'child_database':
      return block.title ? `## ${block.title}` : ''

    case 'equation':
      return block.expression ?? ''

    case 'table_row':
      return `| ${(block.cells ?? []).map(cell => renderRichText(cell)).join(' | ')} |`

    // Bookmarks, embeds, images, files, PDFs and link previews are all just a
    // URL plus an optional caption. extractGammaUrls / extractContactFields
    // read them out of the body, so emit the bare URL on its own line.
    case 'bookmark':
    case 'embed':
    case 'link_preview':
    case 'image':
    case 'video':
    case 'file':
    case 'pdf':
    case 'link_to_page':
      return [block.url ?? '', text].filter(Boolean).join('\n')

    // paragraph, table, column_list, breadcrumb, unsupported, ...
    default:
      return text
  }
}

export function blocksToMarkdown(blocks, depth = 0) {
  const lines = []
  let counter = 0

  for (const block of blocks ?? []) {
    if (block.type === 'numbered_list_item') counter += 1
    else counter = 0

    const rendered = renderBlock(block, { counter })
    if (rendered) lines.push(indent(rendered, depth))

    // Children are indented under their parent, matching the export. Toggles in
    // particular hide their real content down here.
    if (block.children?.length) {
      const nested = blocksToMarkdown(block.children, depth + 1)
      if (nested) lines.push(nested)
    }
  }

  return lines.join('\n')
}
