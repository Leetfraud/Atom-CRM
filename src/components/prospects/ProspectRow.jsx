import Badge from '../ui/Badge'
import { formatDate } from '../../utils/formatDate'

export default function ProspectRow({ prospect, isSelected, isRangeSelected, onClick }) {
  const email = prospect.email_pipeline?.[0]
  const li = prospect.linkedin_pipeline?.[0]
  const tags = prospect.prospect_tags ?? []

  return (
    <tr
      onClick={onClick}
      className={`border-b border-[#1a1a1a] cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-orange-500/5 border-l-2 border-l-orange-500'
          : isRangeSelected
          ? 'bg-orange-500/[0.03] border-l-2 border-l-orange-500/40'
          : 'hover:bg-[#141414]'
      }`}
    >
      {/* Serial */}
      <td className="px-4 py-3 text-zinc-500 text-xs font-mono whitespace-nowrap">
        {prospect.serial}
      </td>

      {/* Name */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-white font-medium">
          {prospect.first_name} {prospect.last_name}
        </span>
      </td>

      {/* Company */}
     <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
  {prospect.company_url ? (
    <a
      href={prospect.company_url}
      target="_blank"
      rel="noreferrer"
      onClick={e => e.stopPropagation()}
      className="hover:text-orange-400 transition"
    >
      {prospect.company ?? '—'}
    </a>
  ) : (
    prospect.company ?? '—'
  )}
</td>

      {/* Role */}
      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap max-w-[160px] truncate">
        {prospect.role_title ?? '—'}
      </td>

      {/* Email Stage */}
      <td className="px-4 py-3 whitespace-nowrap">
        {email?.stage ? <Badge label={email.stage} /> : <span className="text-zinc-600">—</span>}
      </td>

      {/* LI Connection */}
      <td className="px-4 py-3 whitespace-nowrap">
        {li?.connection_status
          ? <Badge label={li.connection_status} />
          : <span className="text-zinc-600">—</span>}
      </td>

      {/* LI DM */}
      <td className="px-4 py-3 whitespace-nowrap">
        {li?.dm_status
          ? <Badge label={li.dm_status} />
          : <span className="text-zinc-600">—</span>}
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {tags.slice(0, 2).map(t => (
            <Badge key={t.tag} label={t.tag} />
          ))}
          {tags.length > 2 && (
            <span className="text-zinc-500 text-xs">+{tags.length - 2}</span>
          )}
        </div>
      </td>
{/* Notes preview */}
<td className="px-4 py-3 max-w-[180px]">
  {prospect.notes ? (
    <span
      className="text-zinc-500 text-xs truncate block cursor-default"
      title={prospect.notes}
    >
      {prospect.notes.length > 60
        ? prospect.notes.slice(0, 60) + '…'
        : prospect.notes}
    </span>
  ) : (
    <span className="text-zinc-700 text-xs">—</span>
  )}
</td>




      
      {/* Added */}
      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
        {formatDate(prospect.created_at)}
      </td>
    </tr>
  )
}