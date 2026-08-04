import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import ImportUploader from '../components/import/ImportUploader'
import ImportReview from '../components/import/ImportReview'
import { useImportCommit } from '../hooks/useImportCommit'
import {
  parseLinkedinCsv,
  parseEmailExport,
  buildReviewRows,
  repairRows,
} from '../utils/importParsers'

export default function Import() {
  const [step, setStep] = useState('upload') // upload | review | done
  const [rows, setRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [result, setResult] = useState(null)
  const { commit, committing, progress, error: commitError } = useImportCommit()

  function handleReady({ linkedinCsvText, emailCsvText, emailMdFiles }) {
    setParseError(null)
    try {
      const linkedinContacts = linkedinCsvText ? parseLinkedinCsv(linkedinCsvText) : []
      const emailContacts = emailMdFiles?.length
        ? parseEmailExport(emailCsvText, emailMdFiles)
        : []
      const built = buildReviewRows(linkedinContacts, emailContacts)
      if (built.length === 0) {
        setParseError('No contacts were found in the provided files. Check the export format.')
        return
      }
      setRows(built)
      setStep('review')
    } catch (err) {
      setParseError(`Failed to parse files: ${err.message}`)
    }
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
      setResult({ count: res.count })
      setStep('done')
    }
  }

  function reset() {
    setRows([])
    setResult(null)
    setParseError(null)
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
                  Upload the LinkedIn connections CSV and/or the Notion email pipeline export. Nothing is written until you confirm on the review screen.
                </p>
              </div>
              {parseError && (
                <p className="text-down text-sm bg-down-dim border border-down/30 rounded-xl px-4 py-2.5">{parseError}</p>
              )}
              <ImportUploader onReady={handleReady} />
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col gap-4">
              {commitError && (
                <p className="text-down text-sm bg-down-dim border border-down/30 rounded-xl px-4 py-2.5">
                  Import failed: {commitError}
                </p>
              )}
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
                  {result?.count} prospect{result?.count === 1 ? '' : 's'} imported successfully.
                </p>
              </div>
              <button
                onClick={reset}
                className="font-mono text-accent hover:text-paper text-[11px] uppercase tracking-wide"
              >
                Import another file
              </button>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}
