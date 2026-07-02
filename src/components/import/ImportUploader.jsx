import { useState } from 'react'
import JSZip from 'jszip'
import Button from '../ui/Button'

// Reads the raw files the user provides and hands the extracted text back up.
// LinkedIn is a single CSV. The email export is either a .zip (CSV + a folder of
// .md files) or the same two pieces picked separately.
export default function ImportUploader({ onReady, parsing }) {
  const [linkedinCsv, setLinkedinCsv] = useState(null)     // { name, text }
  const [emailCsv, setEmailCsv] = useState(null)           // { name, text }
  const [emailMd, setEmailMd] = useState([])               // [{ name, content }]
  const [zipName, setZipName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleLinkedinCsv(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setLinkedinCsv({ name: file.name, text: await file.text() })
  }

  async function handleEmailCsv(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setEmailCsv({ name: file.name, text: await file.text() })
  }

  async function handleEmailMd(e) {
    const files = Array.from(e.target.files ?? [])
    setError(null)
    const csv = files.find(f => f.name.toLowerCase().endsWith('.csv'))
    const md = files.filter(f => f.name.toLowerCase().endsWith('.md'))
    if (csv) setEmailCsv({ name: csv.name, text: await csv.text() })
    setEmailMd(await Promise.all(md.map(async f => ({ name: f.name, content: await f.text() }))))
  }

  async function handleZip(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const zip = await JSZip.loadAsync(file)
      const entries = Object.values(zip.files).filter(f => !f.dir)

      const csvEntry = entries
        .filter(f => f.name.toLowerCase().endsWith('.csv'))
        .sort((a, b) => a.name.split('/').length - b.name.split('/').length)[0]
      const mdEntries = entries.filter(f => f.name.toLowerCase().endsWith('.md'))

      if (!mdEntries.length) {
        setError('No .md files found in the zip. Export from Notion with page content included.')
      }

      if (csvEntry) {
        setEmailCsv({ name: csvEntry.name.split('/').pop(), text: await csvEntry.async('string') })
      }
      setEmailMd(await Promise.all(
        mdEntries.map(async f => ({ name: f.name.split('/').pop(), content: await f.async('string') }))
      ))
      setZipName(file.name)
    } catch (err) {
      setError(`Could not read zip: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const canContinue = linkedinCsv || emailMd.length > 0

  function handleContinue() {
    onReady({
      linkedinCsvText: linkedinCsv?.text ?? '',
      emailCsvText: emailCsv?.text ?? '',
      emailMdFiles: emailMd,
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* LinkedIn */}
      <section className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-1">LinkedIn Connections</p>
        <p className="text-zinc-500 text-xs mb-4">A single CSV exported from the LinkedIn tracker.</p>
        <FileField
          id="li-csv"
          accept=".csv"
          onChange={handleLinkedinCsv}
          label={linkedinCsv ? linkedinCsv.name : 'Choose CSV file'}
          active={!!linkedinCsv}
        />
      </section>

      {/* Email */}
      <section className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
        <p className="text-orange-400 text-xs uppercase tracking-widest mb-1">Email Pipeline</p>
        <p className="text-zinc-500 text-xs mb-4">
          Notion “Export → Markdown &amp; CSV” with page content. Drop the zip, or pick the CSV + the folder of .md files.
        </p>

        <div className="flex flex-col gap-3">
          <FileField
            id="email-zip"
            accept=".zip"
            onChange={handleZip}
            label={busy ? 'Reading zip…' : zipName || 'Choose .zip file'}
            active={!!zipName}
          />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#1f1f1f]" />
            <span className="text-zinc-600 text-xs uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-[#1f1f1f]" />
          </div>

          <FileField
            id="email-folder"
            accept=".md,.csv"
            webkitdirectory
            onChange={handleEmailMd}
            label={emailMd.length ? `${emailMd.length} markdown file(s) selected` : 'Choose folder of .md files'}
            active={emailMd.length > 0}
          />
          <FileField
            id="email-csv"
            accept=".csv"
            onChange={handleEmailCsv}
            label={emailCsv ? emailCsv.name : 'Choose properties CSV (optional if in folder)'}
            active={!!emailCsv}
          />
        </div>
      </section>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleContinue} disabled={!canContinue || busy || parsing}>
          {parsing ? 'Parsing…' : 'Continue to review'}
        </Button>
        <p className="text-zinc-600 text-xs">Provide at least one source to continue.</p>
      </div>
    </div>
  )
}

function FileField({ id, accept, onChange, label, active, webkitdirectory }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm cursor-pointer transition ${
        active
          ? 'border-orange-500/40 bg-orange-500/5 text-orange-300'
          : 'border-[#2a2a2a] bg-[#1a1a1a] text-zinc-400 hover:border-zinc-500'
      }`}
    >
      <span className="shrink-0">{active ? '✓' : '📎'}</span>
      <span className="truncate">{label}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
        {...(webkitdirectory ? { webkitdirectory: '', directory: '', multiple: true } : {})}
      />
    </label>
  )
}
