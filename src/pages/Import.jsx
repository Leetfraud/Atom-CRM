import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import ImportUploader from '../components/import/ImportUploader'
import NotionSource from '../components/import/NotionSource'
import ImportReview from '../components/import/ImportReview'
import { useImportCommit } from '../hooks/useImportCommit'
import {
  parseLinkedinCsv,
  parseEmailExport,
  parseNotionPages,
  buildReviewRows,
  markExistingRows,
  repairRows,
} from '../utils/importParsers'

// Two ways in, one review screen. The Notion source reads the email pipeline
// live over the API; the file source is the original zip/folder upload, kept
// because it still works without a connection and against an archived export.
const SOURCES = [
  { value: 'notion', label: 'Notion (live)' },
  { value: 'files', label: 'File upload' },
]

export default function Import() {
  const [step, setStep] = useState('upload') // upload | review | done
  const [source, setSource] = useState('notion')
  const [rows, setRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [result, setResult] = useState(null)
  // Lives here rather than in NotionSource so switching tabs does not lose it.
  const [linkedinCsv, setLinkedinCsv] = useState(null)
  const { commit, committing, progress, error: commitError } = useImportCommit()

  // Both sources converge here: whatever produced them, email + LinkedIn
  // contacts get matched and turned into review rows the same way.
  //
  // existingByPageId (Notion only) flags the rows that already exist as
  // prospects, so the review screen can distinguish an update from a new
  // person before anything is written.
  function acceptContacts(linkedinContacts, emailContacts, sourceWarnings = [], existingByPageId) {
    const built = buildReviewRows(linkedinContacts, emailContacts)
    if (built.length === 0) {
      setParseError('No contacts were found in that source. Check the format or the database.')
      return
    }
    setRows(markExistingRows(built, existingByPageId))
    setWarnings(sourceWarnings)
    setStep('review')
  }

  function handleFilesReady({ linkedinCsvText, emailCsvText, emailMdFiles }) {
    setParseError(null)
    try {
      acceptContacts(
        linkedinCsvText ? parseLinkedinCsv(linkedinCsvText) : [],
        emailMdFiles?.length ? parseEmailExport(emailCsvText, emailMdFiles) : [],
      )
    } catch (err) {
      setParseError(`Failed to parse files: ${err.message}`)
    }
  }

  function handleNotionReady({ notionPages, syncState, warnings: sourceWarnings }) {
    setParseError(null)
    try {
      acceptContacts(
        linkedinCsv?.text ? parseLinkedinCsv(linkedinCsv.text) : [],
        parseNotionPages(notionPages),
        sourceWarnings,
        syncState,
      )
    } catch (err) {
      setParseError(`Failed to read the Notion database: ${err.message}`)
    }
  }

  async function handlePickLinkedinCsv(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLinkedinCsv({ name: file.name, text: await file.text() })
  }

  function updateRow(id, updates) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)))
  }

  function toggleInclude(id) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, included: !r.included } : r)))
  }

  function setAllIncluded(included) {
    setRows(prev => prev.map(r => ({ ...r, included })))
  }

  function handleRepair(liRowId, emailRowId) {
    setRows(prev => repairRows(prev, liRowId, emailRowId))
  }

  async function handleCommit() {
    const res = await commit(rows)
    if (!res.error) {
      setResult({ count: res.count, inserted: res.inserted, updated: res.updated })
      setStep('done')
    }
  }

  function reset() {
    setRows([])
    setResult(null)
    setParseError(null)
    setWarnings([])
    setStep('upload')
  }

  return (
    <div className="min-h-screen bg-ink p-5 md:p-6">
      <Topbar title="Import" />

      <div className="flex gap-5 items-start">
        <Sidebar />

        <main className="flex-1 min-w-0">
          <div className="bg-card border border-line rounded-[26px] p-5">
          {step === 'upload' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-display font-bold text-paper text-lg">Import prospects</h2>
                <p className="text-paper-dim text-sm mt-1">
                  Pull the email pipeline live from Notion, or upload an export. Nothing is written
                  until you confirm on the review screen.
                </p>
              </div>

              <div className="inline-flex self-start gap-1 p-1 rounded-full bg-card-2 border border-line">
                {SOURCES.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSource(opt.value)}
                    className={`px-4 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wide transition ${
                      source === opt.value
                        ? 'bg-paper text-ink'
                        : 'text-fog hover:text-paper'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {parseError && (
                <p className="text-down text-sm bg-down-dim border border-down/30 rounded-xl px-4 py-2.5">{parseError}</p>
              )}

              {source === 'notion' ? (
                <NotionSource
                  onReady={handleNotionReady}
                  linkedinCsv={linkedinCsv}
                  onPickLinkedinCsv={handlePickLinkedinCsv}
                  onClearLinkedinCsv={() => setLinkedinCsv(null)}
                />
              ) : (
                <ImportUploader onReady={handleFilesReady} />
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col gap-4">
              {commitError && (
                <p className="text-down text-sm bg-down-dim border border-down/30 rounded-xl px-4 py-2.5">
                  Import failed: {commitError}
                </p>
              )}
              {warnings.map((w, i) => (
                <p key={i} className="text-paper-dim text-sm bg-card-2 border border-line rounded-xl px-4 py-2.5">
                  {w}
                </p>
              ))}
              <ImportReview
                rows={rows}
                onChange={updateRow}
                onToggleInclude={toggleInclude}
                onSetAllIncluded={setAllIncluded}
                onRepair={handleRepair}
                onCommit={handleCommit}
                onBack={() => setStep('upload')}
                committing={committing}
                progress={progress}
              />
            </div>
          )}

          {step === 'done' && (
            <div className="max-w-lg bg-card-2 border border-line rounded-[26px] p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-mint-dim border border-mint/30 flex items-center justify-center text-mint text-2xl">✓</div>
              <div>
                <h2 className="font-display font-bold text-paper text-lg">Import complete</h2>
                <p className="text-paper-dim text-sm mt-1">
                  {result?.updated
                    ? `${result.inserted} new prospect${result.inserted === 1 ? '' : 's'} added, ${result.updated} updated.`
                    : `${result?.count} prospect${result?.count === 1 ? '' : 's'} imported successfully.`}
                </p>
              </div>
              <button
                onClick={reset}
                className="font-mono text-accent hover:text-paper text-[11px] uppercase tracking-wide"
              >
                Import another
              </button>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}
