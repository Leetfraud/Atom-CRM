import { useActivityLog } from '../../hooks/useActivityLog'

export default function ProspectNotesPanel({ prospect }) {
  const { logs, loading } = useActivityLog(prospect.id)
  const noteLogs = logs.filter(l => l.note)

  return (
    <div className="fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-line z-40 overflow-y-auto flex flex-col">
      <div className="p-6 border-b border-line sticky top-0 bg-card z-10">
        <p className="font-mono text-accent text-[10px] uppercase tracking-wide mb-1">Notes</p>
        <p className="text-fog text-xs">
          {prospect.first_name} {prospect.last_name}
        </p>
      </div>

      <div className="flex flex-col gap-6 p-6">
        <div>
          <p className="text-fog text-[10px] font-mono uppercase tracking-wide mb-2">General</p>
          {prospect.notes ? (
            <p className="text-paper-dim text-sm leading-relaxed whitespace-pre-wrap">{prospect.notes}</p>
          ) : (
            <p className="text-fog text-xs">No general notes yet.</p>
          )}
        </div>

        <div>
          <p className="text-fog text-[10px] font-mono uppercase tracking-wide mb-2">Note History</p>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : noteLogs.length === 0 ? (
            <p className="text-fog text-xs">No notes logged yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {noteLogs.map(log => (
                <div key={log.id} className="bg-card-2 rounded-xl px-3 py-2.5 border border-line">
                  <p className="text-fog text-[10px] font-mono uppercase tracking-wide mb-1">
                    {log.type === 'linkedin' ? 'LinkedIn' : 'Email'}
                  </p>
                  <p className="text-paper-dim text-xs italic">"{log.note}"</p>
                  <p className="text-fog text-xs mt-1.5">
                    {new Date(log.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
