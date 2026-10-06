import { useState, useEffect, useRef } from "react"

// Creates a version, or edits the label (and, for versions, the target job) of a saved resume.
// mode: "create" | "edit"; isVersion decides whether the job fields are shown when editing.
export default function VersionDialog({ mode, isVersion, masterTitle, initial, onSubmit, onClose }) {
  const [label, setLabel] = useState(initial?.label || "")
  const [company, setCompany] = useState(initial?.target?.company || "")
  const [role, setRole] = useState(initial?.target?.role || "")
  const [jobDescription, setJobDescription] = useState(initial?.target?.jobDescription || "")
  const [tailorNow, setTailorNow] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const firstRef = useRef(null)

  const showJob = mode === "create" || isVersion

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (showJob && !label.trim()) {
      setError("Give this version a label, for example the company and role.")
      return
    }
    setSaving(true)
    setError(null)
    const fields = showJob
      ? { label: label.trim(), target: { company, role, jobDescription } }
      : { label: label.trim() }
    const err = await onSubmit(fields, { tailorNow: mode === "create" && tailorNow && jobDescription.trim().length > 0 })
    setSaving(false)
    if (err) setError(err)
  }

  const title = mode === "create" ? "New version" : isVersion ? "Version details" : "Rename resume"

  return (
    <>
      <div className="scrim" onClick={onClose}></div>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="version-title">
        <h2 id="version-title" className="drawer-title">{title}</h2>
        <p className="dialog-sub">
          {mode === "create"
            ? `A copy of ${masterTitle} for one job. Changes to it never affect the original.`
            : isVersion
              ? "The job this version is for. The job description is used for tailoring and ATS checks."
              : "A name to tell this resume apart on your dashboard."}
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">{showJob ? "Label" : "Name"}</span>
            <input
              ref={firstRef}
              className="input"
              maxLength={80}
              placeholder={showJob ? "Infosys – Systems Engineer" : "My main resume"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          {showJob && (
            <>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Company <span className="field-hint">(optional)</span></span>
                  <input className="input" maxLength={80} value={company} onChange={(e) => setCompany(e.target.value)} />
                </label>
                <label className="field">
                  <span className="field-label">Role <span className="field-hint">(optional)</span></span>
                  <input className="input" maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Job description <span className="field-hint">(optional)</span></span>
                <textarea
                  className="input"
                  maxLength={8000}
                  placeholder="Paste the job description to tailor this version and check its ATS score"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </label>
              {mode === "create" && jobDescription.trim() && (
                <label className="check-field">
                  <input type="checkbox" checked={tailorNow} onChange={(e) => setTailorNow(e.target.checked)} />
                  <span>Tailor it to this job now</span>
                </label>
              )}
            </>
          )}

          {error && <div className="alert" role="alert">{error}</div>}

          <div className="dialog-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving…" : mode === "create" ? "Create version" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
