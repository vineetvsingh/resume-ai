import { GitBranch, Wand2, PencilLine, Plus } from "lucide-react"

// Shows which saved resume is open (master or version) and its version actions
export default function VersionBar({ meta, masterTitle, tailoring, onNewVersion, onEditDetails, onTailor }) {
  const isVersion = Boolean(meta.parentId)
  const job = [meta.target?.role, meta.target?.company].filter(Boolean).join(" at ")
  const hasJd = Boolean(meta.target?.jobDescription)

  return (
    <div className={`version-bar${isVersion ? " is-version" : ""}`}>
      <div className="version-info">
        <p className="version-kind">
          {isVersion ? <><GitBranch size={13} strokeWidth={2.2} /> Version of {masterTitle || "your master resume"}</> : "Master resume"}
        </p>
        <p className="version-label">{meta.label || meta.name || "Untitled resume"}</p>
        {isVersion && job && <p className="version-job">{job}</p>}
      </div>
      <div className="version-actions">
        {isVersion && (
          <button
            onClick={onTailor}
            disabled={!hasJd || tailoring}
            className="btn btn-ghost btn-sm"
            title={hasJd ? "Rewrite the summary and reorder skills and projects for this job" : "Add a job description in Edit details first"}
          >
            <Wand2 size={14} strokeWidth={2} />
            {tailoring ? "Tailoring…" : "Tailor to this job"}
          </button>
        )}
        <button onClick={onEditDetails} className="btn btn-ghost btn-sm">
          <PencilLine size={14} strokeWidth={2} />
          {isVersion ? "Edit details" : "Rename"}
        </button>
        <button onClick={onNewVersion} className="btn btn-ghost btn-sm">
          <Plus size={14} strokeWidth={2} />
          New version
        </button>
      </div>
      {isVersion && !hasJd && (
        <p className="version-hint">Add a job description in Edit details to tailor this version and pre-fill its ATS check.</p>
      )}
    </div>
  )
}
