import { useEffect, useMemo, useState } from 'react'
import Button from '../ui/Button'
import { useNotionImport } from '../../hooks/useNotionImport'
import { useOAuthConnect } from '../../hooks/useOAuthConnect'

// Pull the email pipeline straight out of Notion instead of a downloaded zip.
//
// The flow is deliberately three explicit steps — connect, pick, pull — because
// the third one is slow: page bodies cost at least one API request each against
// a ~3/second limit, so a 950-row database takes minutes and needs a progress
// bar rather than a spinner.
export default function NotionSource({ onReady, linkedinCsv, onPickLinkedinCsv, onClearLinkedinCsv }) {
  const { connected, databases, loading, progress, error, loadDatabases, fetchDatabase, clearError } =
    useNotionImport()
  const { connect } = useOAuthConnect()

  const [selectedId, setSelectedId] = useState('')
  const [filter, setFilter] = useState('')
  const [withBodies, setWithBodies] = useState(true)
  const [skipUnchanged, setSkipUnchanged] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    loadDatabases()
  }, [loadDatabases])

  // Surface the outcome of the OAuth round trip we just came back from.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'notion') setNotice('Notion connected.')
    const oauthError = params.get('error')
    if (oauthError) setNotice(`Notion connection failed: ${oauthError}`)
    if (params.has('connected') || params.has('error')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return databases
    return databases.filter(db => db.title.toLowerCase().includes(needle))
  }, [databases, filter])

  async function handleConnect() {
    setConnecting(true)
    try {
      await connect('notion', '/import')
    } catch (err) {
      setNotice(`Could not start the Notion connection: ${err.message}`)
      setConnecting(false)
    }
  }

  async function handlePull() {
    clearError()
    setNotice(null)
    try {
      const { pages, syncState, truncated, failures, counts } =
        await fetchDatabase(selectedId, { withBodies, skipUnchanged })

      if (!pages.length) {
        setNotice(
          counts.skipped
            ? `Nothing to import — all ${counts.total} page(s) are unchanged since the last import.`
            : 'That database has no rows the integration can see.',
        )
        return
      }

      const warnings = [
        truncated ? 'Row cap reached — only the first 5000 rows were pulled.' : '',
        counts.skipped ? `${counts.skipped} unchanged page(s) skipped.` : '',
        failures.length
          ? `${failures.length} page(s) had no readable content and were imported from their properties only.`
          : '',
        // Worth saying plainly, because it is the one thing a re-import will
        // not bring across.
        counts.known ? 'Existing prospects keep the notes they already have in Atom.' : '',
      ].filter(Boolean)

      onReady({ notionPages: pages, syncState, warnings })
    } catch (err) {
      if (err.needsConnect) setNotice(null) // the connect panel takes over
    }
  }

  const busy = loading || connecting
  const pulling = loading && progress.total > 0
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* LinkedIn stays a file upload — it is a separate tracker, not a Notion database. */}
      <section className="bg-card-2 border border-line rounded-2xl p-5">
        <p className="font-mono text-accent text-[10px] uppercase tracking-wide mb-1">LinkedIn Connections</p>
        <p className="text-fog text-xs mb-4">
          Optional. A single CSV exported from the LinkedIn tracker, matched against the Notion rows by name.
        </p>
        <FilePill
          label={linkedinCsv ? linkedinCsv.name : 'Choose CSV file'}
          active={!!linkedinCsv}
          onChange={onPickLinkedinCsv}
          onClear={onClearLinkedinCsv}
        />
      </section>

      <section className="bg-card-2 border border-line rounded-2xl p-5">
        <p className="font-mono text-accent text-[10px] uppercase tracking-wide mb-1">Email Pipeline — Notion</p>
        <p className="text-fog text-xs mb-4">
          Reads the database directly — no export, no zip. Safe to re-run: pages already imported
          are updated in place rather than duplicated. Notion only shares the pages you picked when
          you authorised the connection.
        </p>

        {notice && (
          <p className="text-paper-dim text-xs bg-card border border-line rounded-xl px-4 py-2.5 mb-4">
            {notice}
          </p>
        )}

        {connected === false ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-paper-dim text-sm">
              Atom is not connected to Notion yet. You will be asked to choose which pages and
              databases to share.
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? 'Redirecting…' : 'Connect Notion'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter databases…"
              className="px-4 py-2.5 rounded-xl bg-card border border-line text-paper text-sm placeholder:text-fog focus:outline-none focus:border-paper-dim"
            />

            <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1">
              {connected === null && <p className="text-fog text-xs px-1">Checking connection…</p>}

              {connected && !visible.length && !loading && (
                <p className="text-fog text-xs px-1">
                  {databases.length
                    ? 'No database matches that filter.'
                    : 'No databases shared with this integration. Open the database in Notion → ⋯ → Connections → add Atom.'}
                </p>
              )}

              {visible.map(db => (
                <button
                  key={db.id}
                  type="button"
                  onClick={() => setSelectedId(db.id)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                    selectedId === db.id
                      ? 'border-accent/40 bg-accent-dim text-accent'
                      : 'border-line bg-card text-paper-dim hover:border-paper-dim'
                  }`}
                >
                  <span className="block truncate">{db.title}</span>
                  <span className="block text-fog text-[11px] truncate mt-0.5">
                    {db.properties.slice(0, 6).join(' · ')}
                    {db.properties.length > 6 ? ` +${db.properties.length - 6}` : ''}
                  </span>
                </button>
              ))}
            </div>

            <label className="flex items-start gap-2.5 text-xs text-paper-dim cursor-pointer px-1">
              <input
                type="checkbox"
                checked={withBodies}
                onChange={e => setWithBodies(e.target.checked)}
                className="mt-0.5 accent-current"
              />
              <span>
                Read page content
                <span className="text-fog">
                  {' '}— needed for emails, Gamma links and notes. Much slower: roughly one request
                  per page. Uncheck for a quick properties-only pull.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-paper-dim cursor-pointer px-1">
              <input
                type="checkbox"
                checked={skipUnchanged}
                onChange={e => setSkipUnchanged(e.target.checked)}
                className="mt-0.5 accent-current"
              />
              <span>
                Skip pages unchanged since the last import
                <span className="text-fog">
                  {' '}— this is what makes a re-run quick. Uncheck to pull everything again, e.g.
                  after changing how a field is parsed.
                </span>
              </span>
            </label>

            {pulling && (
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 rounded-full bg-card overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="font-mono text-fog text-[10px] uppercase tracking-wide">
                  Reading pages {progress.done} / {progress.total}
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-down text-xs mt-3">{error}</p>}
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={handlePull} disabled={!selectedId || busy || !connected}>
          {pulling ? 'Pulling…' : 'Pull from Notion'}
        </Button>
        <p className="text-fog text-xs">
          {selectedId ? 'Nothing is written until you confirm on the review screen.' : 'Pick a database to continue.'}
        </p>
      </div>
    </div>
  )
}

function FilePill({ label, active, onChange, onClear }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition ${
        active
          ? 'border-accent/40 bg-accent-dim text-accent'
          : 'border-line bg-card text-paper-dim hover:border-paper-dim'
      }`}
    >
      <label htmlFor="notion-li-csv" className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
        <span className="shrink-0">{active ? '✓' : '📎'}</span>
        <span className="truncate">{label}</span>
        <input id="notion-li-csv" type="file" accept=".csv" onChange={onChange} className="hidden" />
      </label>
      {active && onClear && (
        <button
          type="button"
          onClick={onClear}
          title="Clear"
          className="shrink-0 text-fog hover:text-down transition text-base leading-none px-1"
        >
          ✕
        </button>
      )}
    </div>
  )
}
