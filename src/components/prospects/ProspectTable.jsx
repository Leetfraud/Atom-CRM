import ProspectRow from './ProspectRow'

export default function ProspectTable({ prospects, onSelectProspect, selectedId }) {
  if (prospects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-zinc-500 text-sm">No prospects found.</p>
        <p className="text-zinc-600 text-xs mt-1">Try adjusting your filters or add a new prospect.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1f1f1f]">
            {[
              'Serial', 'Name', 'Company', 'Role',
              'Email Stage', 'LI Connection', 'LI DM', 'Tags', 'Notes', 'Added'
            ].map(col => (
              <th key={col} className="text-left text-xs text-zinc-500 uppercase tracking-widest font-medium px-4 py-3 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prospects.map(prospect => (
            <ProspectRow
              key={prospect.id}
              prospect={prospect}
              isSelected={selectedId === prospect.id}
              onClick={() => onSelectProspect(prospect)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}