import { useState } from "react"
import { Upload, FileText, X, CircleCheck, CircleAlert, CircleX } from "lucide-react"
import { readResumeFile, readabilityChecks, ACCEPT, MAX_FILE_MB } from "../resumeFile"

function verdict(score) {
  if (score >= 70) return { text: "Strong match", color: "var(--ok)" }
  if (score >= 45) return { text: "Partial match", color: "var(--warn)" }
  return { text: "Weak match", color: "var(--pen)" }
}

const CHECK_ICONS = {
  pass: <CircleCheck size={17} strokeWidth={2} />,
  warn: <CircleAlert size={17} strokeWidth={2} />,
  fail: <CircleX size={17} strokeWidth={2} />
}

export default function ATSScorer({ onScore, loading, result, onPlan, initialJd = "", hasResume = true }) {
  const [jd, setJd] = useState(initialJd)
  // "builder" checks the resume on screen; "upload" checks a file the user brings
  const [source, setSource] = useState(result?.source || (hasResume ? "builder" : "upload"))
  // { name, kind, text, words, pages, checks } for the uploaded file
  const [upload, setUpload] = useState(null)
  const [reading, setReading] = useState(false)
  const [fileError, setFileError] = useState(null)
  const [dragging, setDragging] = useState(false)

  const shown = result?.source === source ? result : null
  const v = shown ? verdict(shown.score) : null
  const uploadUnreadable = upload?.checks.some((c) => c.id === "text" && c.status === "fail")

  async function handleFile(file) {
    if (!file) return
    setReading(true)
    setFileError(null)
    try {
      const parsed = await readResumeFile(file)
      setUpload({ ...parsed, checks: readabilityChecks(parsed) })
    } catch (e) {
      setUpload(null)
      setFileError(e.message)
    }
    setReading(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  function analyze() {
    if (source === "upload") onScore(jd, upload)
    else onScore(jd)
  }

  const canAnalyze = source === "upload"
    ? upload && !uploadUnreadable
    : hasResume && jd.trim()

  return (
    <div>
      <div className="seg ats-source" role="radiogroup" aria-label="Resume to check">
        <button role="radio" aria-checked={source === "builder"} className={`seg-btn${source === "builder" ? " is-on" : ""}`} onClick={() => setSource("builder")}>
          Resume on screen
        </button>
        <button role="radio" aria-checked={source === "upload"} className={`seg-btn${source === "upload" ? " is-on" : ""}`} onClick={() => setSource("upload")}>
          <Upload size={14} strokeWidth={2} /> Upload a resume
        </button>
      </div>

      {source === "builder" && !hasResume && (
        <p className="ats-note">There is no resume on screen yet. Build one first, or upload a resume you already have.</p>
      )}

      {source === "upload" && (
        upload ? (
          <div className="upload-card">
            <div className="upload-file">
              <FileText size={18} strokeWidth={2} />
              <span className="upload-name">{upload.name}</span>
              <span className="upload-meta">
                {upload.pages ? `${upload.pages} ${upload.pages === 1 ? "page" : "pages"} · ` : ""}{upload.words} words
              </span>
              <button className="icon-btn" onClick={() => setUpload(null)} aria-label="Remove file" title="Remove file">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <h3 className="kw-title">Can ATS software read it?</h3>
            <ul className="checks">
              {upload.checks.map((c) => (
                <li key={c.id} className={`check is-${c.status}`}>
                  {CHECK_ICONS[c.status]}
                  <div>
                    <strong>{c.title}</strong>
                    <span>{c.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <label
            className={`dropzone${dragging ? " is-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = "" }} disabled={reading} />
            <Upload size={22} strokeWidth={1.8} />
            <strong>{reading ? "Reading your resume…" : "Choose a file or drop it here"}</strong>
            <span>PDF, Word (.docx) or text, up to {MAX_FILE_MB} MB. It is read on your device and not stored.</span>
          </label>
        )
      )}
      {fileError && <div className="alert" role="alert">{fileError}</div>}

      <label className="field ats-jd">
        <span className="field-label">
          Job description
          {source === "upload"
            ? <span className="field-hint"> (optional: leave empty for a general check)</span>
            : initialJd && jd === initialJd && <span className="field-hint"> (saved with this version)</span>}
        </span>
        <textarea
          className="input input-tall"
          placeholder="Paste the full job description here"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
      </label>
      <button onClick={analyze} disabled={loading || reading || !canAnalyze} className="btn btn-primary btn-block">
        {loading ? "Analyzing…" : source === "upload" && !jd.trim() ? "Check my resume" : "Analyze match"}
      </button>

      {shown && (
        <div className="result">
          <div className="score">
            <span className="score-num">{shown.score}<small>%</small></span>
            <span className="score-verdict" style={{ color: v.color }}>
              {shown.general ? v.text.replace("match", "resume") : v.text}
            </span>
          </div>
          <div className="meter" role="meter" aria-valuenow={shown.score} aria-valuemin={0} aria-valuemax={100} aria-label={shown.general ? "Resume score" : "Match score"}>
            <div style={{ width: `${shown.score}%`, background: v.color }} />
          </div>

          {shown.summary && <p className="result-summary">{shown.summary}</p>}

          {shown.strengths?.length > 0 && (
            <div className="kw-group">
              <h3 className="kw-title">What works</h3>
              <ul className="fix-list">
                {shown.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {shown.fixes?.length > 0 && (
            <div className="kw-group">
              <h3 className="kw-title">What to fix</h3>
              <ul className="fix-list is-fix">
                {shown.fixes.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {shown.foundKeywords?.length > 0 && (
            <div className="kw-group">
              <h3 className="kw-title">Keywords you already have</h3>
              <div className="kw-list">
                {shown.foundKeywords.map((k, i) => <span key={i} className="kw-found">{k}</span>)}
              </div>
            </div>
          )}

          {shown.missingKeywords?.length > 0 && (
            <div className="kw-group">
              <h3 className="kw-title">Keywords to add</h3>
              <p className="kw-hint">Tap a keyword to get a short plan for actually learning it.</p>
              <div className="kw-list">
                {shown.missingKeywords.map((k, i) => (
                  <button key={i} className="kw-missing kw-plan" onClick={() => onPlan(k)} title={`Get a plan to learn ${k}`}>{k}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
