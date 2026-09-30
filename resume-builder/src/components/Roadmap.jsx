import { useState } from "react"
import { ArrowLeft, Check, FilePlus2 } from "lucide-react"

// Number weeks by position, whatever numbering the stored plan used
function weekTitle(title, i) {
  const focus = title.replace(/^week\s*\d+\s*[:\-–]?\s*/i, "")
  return focus ? `Week ${i + 1}: ${focus}` : `Week ${i + 1}`
}

function Step({ id, done, onToggle, children }) {
  return (
    <label className={`step${done ? " is-done" : ""}`}>
      <input type="checkbox" checked={done} onChange={() => onToggle(id)} />
      <span className="step-box" aria-hidden="true">{done && <Check size={14} strokeWidth={3} />}</span>
      <span className="step-body">{children}</span>
    </label>
  )
}

export default function Roadmap({ keyword, roadmap, loading, error, jobsAsking, onToggle, onAddToResume, onDelete, onRetry, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (loading || (!roadmap && !error)) {
    return (
      <main className="dash roadmap">
        <button onClick={onBack} className="link-btn roadmap-back"><ArrowLeft size={15} /> Back to dashboard</button>
        <h1 className="dash-title">Making your {keyword} plan…</h1>
        <p className="dash-muted">Building a short plan around your target role and the skills already on your resume. This takes a few seconds.</p>
        <div className="roadmap-skeleton" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dash roadmap">
        <button onClick={onBack} className="link-btn roadmap-back"><ArrowLeft size={15} /> Back to dashboard</button>
        <h1 className="dash-title">Your {keyword} plan</h1>
        <div className="alert" role="alert">{error}</div>
        <button onClick={onRetry} className="btn btn-ghost" style={{ marginTop: 12 }}>Try again</button>
      </main>
    )
  }

  const { plan, done } = roadmap
  const doneSet = new Set(done)
  const total = plan.weeks.reduce((n, w) => n + w.tasks.length, 0) + 1
  const learned = doneSet.size >= total

  return (
    <main className="dash roadmap">
      <button onClick={onBack} className="link-btn roadmap-back"><ArrowLeft size={15} /> Back to dashboard</button>

      <header className="roadmap-head">
        <h1 className="dash-title">Learn {roadmap.keyword}</h1>
        {plan.summary && <p className="roadmap-lede">{plan.summary}</p>}
        {jobsAsking > 0 && (
          <p className="dash-muted">Missing from {jobsAsking} {jobsAsking === 1 ? "job" : "jobs"} you checked.</p>
        )}
      </header>

      <div className="roadmap-progress" role="status">
        <div className="roadmap-progress-text">
          <strong>{learned ? `You've learned ${roadmap.keyword}` : `${doneSet.size} of ${total} steps done`}</strong>
          <span className="dash-muted">{learned ? "Add it to your resume below." : "Your progress is saved as you go."}</span>
        </div>
        <span className="roadmap-bar" aria-hidden="true"><span style={{ width: `${(doneSet.size / total) * 100}%` }}></span></span>
      </div>

      <div className="roadmap-grid">
        <div>
          {plan.why && (
            <section className="panel">
              <h2 className="dash-h">Why employers ask for it</h2>
              <p className="roadmap-text">{plan.why}</p>
            </section>
          )}

          {plan.weeks.map((week, i) => (
            <section key={week.title} className="panel">
              <h2 className="dash-h roadmap-week">{weekTitle(week.title, i)}</h2>
              <div className="steps">
                {week.tasks.map((t) => (
                  <Step key={t.id} id={t.id} done={doneSet.has(t.id)} onToggle={onToggle}>{t.text}</Step>
                ))}
              </div>
            </section>
          ))}

          <section className="panel roadmap-project">
            <h2 className="dash-h">Prove it with a project</h2>
            <Step id={plan.project.id} done={doneSet.has(plan.project.id)} onToggle={onToggle}>
              <strong>{plan.project.title}</strong>
              {plan.project.description && <span className="step-note">{plan.project.description}</span>}
            </Step>
            {plan.project.steps.length > 0 && (
              <ol className="project-steps">
                {plan.project.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            )}
          </section>
        </div>

        <aside>
          {plan.resources.length > 0 && (
            <section className="panel">
              <h2 className="dash-h">Free resources</h2>
              <ul className="resource-list">
                {plan.resources.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </section>
          )}

          <section className={`panel roadmap-finish${learned ? " is-ready" : ""}`}>
            <h2 className="dash-h">When you finish</h2>
            <p className="dash-muted">This line and the skill go on your resume, backed by a project you actually built.</p>
            {plan.resumeLine && <p className="roadmap-line">{plan.resumeLine}</p>}
            <button onClick={() => onAddToResume(roadmap)} disabled={!learned} className="btn btn-primary btn-block">
              <FilePlus2 size={16} strokeWidth={2} />
              Add to my resume
            </button>
            {!learned && <p className="dash-muted roadmap-hint">Tick off every step, including the project, to unlock this.</p>}
          </section>

          <div className="roadmap-delete">
            {confirmDelete ? (
              <button onClick={() => onDelete(roadmap)} onBlur={() => setConfirmDelete(false)} className="btn btn-danger btn-sm" autoFocus>
                Delete this plan and its progress?
              </button>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="link-btn">Delete plan</button>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
