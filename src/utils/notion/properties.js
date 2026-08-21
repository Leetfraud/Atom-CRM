// ---------------------------------------------------------------------------
// Notion page properties -> the flat { "Column Name": "value" } map that the
// CSV half of an export produces.
//
// Flattening to strings here means the live path can reuse pick() and the same
// header-spelling candidates the zip path uses, so a database whose columns are
// named "Label" vs "Tags" behaves identically down both routes.
// ---------------------------------------------------------------------------

function richTextToPlain(rich) {
  return (rich ?? []).map(r => r.plain_text ?? '').join('').trim()
}

// Mirrors how Notion renders each property type into a CSV cell.
export function propertyToString(prop) {
  if (!prop || typeof prop !== 'object') return ''

  switch (prop.type) {
    case 'title':
      return richTextToPlain(prop.title)
    case 'rich_text':
      return richTextToPlain(prop.rich_text)

    case 'select':
      return prop.select?.name ?? ''
    case 'status':
      return prop.status?.name ?? ''
    case 'multi_select':
      return (prop.multi_select ?? []).map(o => o.name).filter(Boolean).join(', ')

    // The CSV export writes checkboxes as Yes/No, and buildEmailCsvIndex tests
    // for "yes" — so keep that spelling rather than true/false.
    case 'checkbox':
      return prop.checkbox ? 'Yes' : 'No'

    case 'number':
      return prop.number == null ? '' : String(prop.number)
    case 'email':
      return prop.email ?? ''
    case 'url':
      return prop.url ?? ''
    case 'phone_number':
      return prop.phone_number ?? ''

    case 'date':
      return [prop.date?.start, prop.date?.end].filter(Boolean).join(' → ')
    case 'created_time':
      return prop.created_time ?? ''
    case 'last_edited_time':
      return prop.last_edited_time ?? ''

    case 'people':
      return (prop.people ?? []).map(p => p.name).filter(Boolean).join(', ')
    case 'created_by':
      return prop.created_by?.name ?? ''
    case 'last_edited_by':
      return prop.last_edited_by?.name ?? ''

    case 'files':
      return (prop.files ?? [])
        .map(f => f.external?.url ?? f.file?.url ?? f.name ?? '')
        .filter(Boolean)
        .join(', ')

    case 'unique_id':
      return prop.unique_id
        ? [prop.unique_id.prefix, prop.unique_id.number].filter(v => v != null).join('-')
        : ''

    // A formula or rollup wraps another value; unwrap one level and re-dispatch
    // by the inner type so "Status (formula)" columns still read as text.
    case 'formula':
      return propertyToString({ type: prop.formula?.type, ...prop.formula })
    case 'rollup': {
      const roll = prop.rollup
      if (!roll) return ''
      if (roll.type === 'array') {
        return (roll.array ?? []).map(propertyToString).filter(Boolean).join(', ')
      }
      return propertyToString({ type: roll.type, ...roll })
    }

    case 'relation':
      // Relations only carry ids without a second round trip; the import does
      // not use them, so surface the count rather than a wall of uuids.
      return (prop.relation ?? []).length ? `${prop.relation.length} linked` : ''

    case 'string':
      return prop.string ?? ''
    case 'boolean':
      return prop.boolean ? 'Yes' : 'No'

    default:
      return ''
  }
}

// Flatten every property on a page into { columnName: stringValue }.
export function pageProperties(page) {
  const out = {}
  for (const [name, prop] of Object.entries(page?.properties ?? {})) {
    out[name] = propertyToString(prop)
  }
  return out
}

// The page title lives in the one property of type "title", whatever it is
// named. Matching on type rather than on the name "Name" survives databases
// whose title column was renamed.
export function pageTitle(page) {
  for (const prop of Object.values(page?.properties ?? {})) {
    if (prop?.type === 'title') return richTextToPlain(prop.title)
  }
  return ''
}
