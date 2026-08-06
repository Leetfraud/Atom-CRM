import ProspectRow from './ProspectRow'

export default function ProspectTable({ prospects, onSelectProspect, onContextMenuProspect = () => {}, selectedId, selectedIds = new Set() }) {
  if (prospects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-paper-dim text-sm">No prospects found.</p>
        <p className="text-fog text-xs mt-1">Try adjusting your filters or add a new prospect.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            {[
              'Serial', 'Name', 'Company', 'Role',
              'Email Stage', 'LI Connection', 'LI DM', 'Tags', 'Notes', 'Added'
            ].map(col => (
              <th key={col} className="text-left font-mono text-[10.5px] text-fog uppercase tracking-wide font-medium px-4 py-3 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect, index) => (
            <ProspectRow
              key={prospect.id}
              prospect={prospect}
              isSelected={selectedId === prospect.id}
              isRangeSelected={selectedIds.has(prospect.id)}
              onClick={(e) => onSelectProspect(prospect, index, e.shiftKey)}
              onContextMenu={(e) => onContextMenuProspect(e, prospect, index)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}