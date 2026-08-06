import Badge from '../ui/Badge'
import { formatDate } from '../../utils/formatDate'

export default function ProspectRow({ prospect, isSelected, onClick }) {
  const email = prospect.email_pipeline?.[0]
  const li = prospect.linkedin_pipeline?.[0]
  const tags = prospect.prospect_tags ?? []

  return (
    <tr
      onClick={onClick}
      className={`border-b border-line/60 cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-accent-dim border-l-2 border-l-accent'
          : 'hover:bg-card-2'
      }`}
    >
      {/* Serial */}
      <td className="px-4 py-3 text-fog text-xs font-mono whitespace-nowrap">
        {prospect.serial}
      </td>

      {/* Name */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-paper font-medium">
          {prospect.first_name} {prospect.last_name}
        </span>
      </td>

      {/* Company */}
     <td className="px-4 py-3 text-paper-dim whitespace-nowrap">
  {prospect.company_url ? (
    <a
      href={prospect.company_url}
      target="_blank"
      rel="noreferrer"
      onClick={e => e.stopPropagation()}
      className="hover:text-accent transition"
    >
      {prospect.company ?? '—'}
    </a>
  ) : (
    prospect.company ?? '—'
  )}
</td>

      {/* Role */}
      <td className="px-4 py-3 text-paper-dim whitespace-nowrap max-w-[160px] truncate">
        {prospect.role_title ?? '—'}
      </td>

      {/* Email Stage */}
      <td className="px-4 py-3 whitespace-nowrap">
        {email?.stage ? <Badge label={email.stage} /> : <span className="text-fog">—</span>}
      </td>

      {/* LI Connection */}
      <td className="px-4 py-3 whitespace-nowrap">
        {li?.connection_status
          ? <Badge label={li.connection_status} />
          : <span className="text-fog">—</span>}
      </td>

      {/* LI DM */}
      <td className="px-4 py-3 whitespace-nowrap">
        {li?.dm_status
          ? <Badge label={li.dm_status} />
          : <span className="text-fog">—</span>}
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {tags.slice(0, 2).map(t => (
            <Badge key={t.tag} label={t.tag} />
          ))}
          {tags.length > 2 && (
            <span className="text-fog text-xs">+{tags.length - 2}</span>
          )}
        </div>
      </td>
{/* Notes preview */}
<td className="px-4 py-3 max-w-[180px]">
  {prospect.notes ? (
    <span
      className="text-fog text-xs truncate block cursor-default"
      title={prospect.notes}
    >
      {prospect.notes.length > 60
        ? prospect.notes.slice(0, 60) + '…'
        : prospect.notes}
    </span>
  ) : (
    <span className="text-line text-xs">—</span>
  )}
</td>


      {/* Added */}
      <td className="px-4 py-3 text-fog text-xs whitespace-nowrap">
        {formatDate(prospect.created_at)}
      </td>
    </tr>
  )
}
