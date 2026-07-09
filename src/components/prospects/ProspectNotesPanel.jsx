import { useActivityLog } from '../../hooks/useActivityLog'

export default function ProspectNotesPanel({ prospect }) {
  const { logs, loading } = useActivityLog(prospect.id)
  const noteLogs = logs.filter(l => l.note)

  return (
    <div className="fixed top-14 left-56 bottom-0 w-72 bg-[#0f0f0f] border-r border-[#1f1f1f] z-30 overflow-y-auto flex flex-col">
      <div className="p-6 border-b border-[#1f1f1f] sticky top-0 bg-[#0f0f0f] z-10">
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-1">Notes</p>
        <p className="text-zinc-500 text-xs">
          {prospect.first_name} {prospect.last_name}
        </p>
      </div>

      <div className="flex flex-col gap-6 p-6">
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">General</p>
          {prospect.notes ? (
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{prospect.notes}</p>
          ) : (
            <p className="text-zinc-600 text-xs">No general notes yet.</p>
          )}
        </div>

        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Note History</p>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : noteLogs.length === 0 ? (
            <p className="text-zinc-600 text-xs">No notes logged yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {noteLogs.map(log => (
                <div key={log.id} className="bg-[#1a1a1a] rounded-lg px-3 py-2.5 border border-[#2a2a2a]">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                    {log.type === 'linkedin' ? '🔗 LinkedIn' : '✉️ Email'}
                  </p>
                  <p className="text-zinc-300 text-xs italic">"{log.note}"</p>
                  <p className="text-zinc-600 text-xs mt-1.5">
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
