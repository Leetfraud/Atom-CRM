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
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar />
      <div className="flex-1 ml-56">
        <Topbar title="Import" />
        <main className="pt-14 p-6">
          {step === 'upload' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-white font-semibold text-lg">Import prospects</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Upload the LinkedIn connections CSV and/or the Notion email pipeline export. Nothing is written until you confirm on the review screen.
                </p>
              </div>
              {parseError && (
                <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/40 rounded-lg px-4 py-2.5">{parseError}</p>
              )}
              <ImportUploader onReady={handleReady} />
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col gap-4">
              {commitError && (
                <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/40 rounded-lg px-4 py-2.5">
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
            <div className="max-w-lg bg-[#111111] border border-[#1f1f1f] rounded-xl p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400 text-2xl">✓</div>
              <div>
                <h2 className="text-white font-semibold text-lg">Import complete</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  {result?.count} prospect{result?.count === 1 ? '' : 's'} imported successfully.
                </p>
              </div>
              <button
                onClick={reset}
                className="text-orange-400 hover:text-orange-300 text-sm uppercase tracking-widest"
              >
                Import another file
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
