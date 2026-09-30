import { useState, useRef, useLayoutEffect } from "react"
import { Plus } from "lucide-react"

const fmtDate = (d, opts = { day: "numeric", month: "short" }) => new Date(d).toLocaleDateString(undefined, opts)

function scoreBand(score) {
  if (score >= 70) return { label: "Strong", color: "var(--ok)" }
  if (score >= 45) return { label: "Partial", color: "var(--warn)" }
  return { label: "Weak", color: "var(--pen)" }
}

function greetingName(data) {
  const first = data.displayName?.trim().split(/\s+/)[0]
  return first || data.user.email.split("@")[0]
}

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function ScoreChart({ checks }) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState(null)
  const points = [...checks].reverse() // oldest first
  const height = 200
  const pad = { top: 12, right: 12, bottom: 24, left: 34 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v) => pad.top + innerH - (v / 100) * innerH
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.score)}`).join(" ")
  const slot = points.length > 1 ? innerW / (points.length - 1) : innerW
  const activePoint = active !== null ? points[active] : null

  return (
    <div ref={ref} className="chart" onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`ATS scores for your last ${points.length} checks, from ${points[0].score}% to ${points[points.length - 1].score}%`}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className="chart-grid" />
              <text x={pad.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="chart-axis">{v}</text>
            </g>
          ))}
          <text x={pad.left} y={height - 4} className="chart-axis">{fmtDate(points[0].createdAt)}</text>
          {points.length > 1 && fmtDate(points[0].createdAt) !== fmtDate(points[points.length - 1].createdAt) && (
            <text x={width - pad.right} y={height - 4} textAnchor="end" className="chart-axis">{fmtDate(points[points.length - 1].createdAt)}</text>
          )}
          {activePoint && <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} className="chart-crosshair" />}
          <path d={path} className="chart-line" />
          {points.map((p, i) => (
            <circle key={p._id} cx={x(i)} cy={y(p.score)} r={active === i ? 6 : 4} className="chart-dot" />
          ))}
          {points.map((p, i) => (
            <rect
              key={`hit-${p._id}`}
              x={x(i) - slot / 2}
              y={pad.top}
              width={Math.max(slot, 16)}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              aria-label={`${p.score}% on ${fmtDate(p.createdAt)} for ${p.resumeName || "unsaved resume"}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>
      )}
      {activePoint && (
        <div
          className="chart-tip"
          style={{
            left: Math.min(Math.max(x(active), 90), width - 90),
            top: y(activePoint.score) - 12
          }}
        >
          <strong>{activePoint.score}%</strong> {scoreBand(activePoint.score).label} match
          <span>{activePoint.resumeName || "Unsaved resume"}, {fmtDate(activePoint.createdAt)}</span>
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ data, error, currentResume, onContinue, onOpenResume, onDeleteResume, onNewResume, onCheckAts, onRetry }) {
  const [confirmDelete, setConfirmDelete] = useState(null)

  if (error) {
    return (
      <main className="dash">
        <div className="alert" role="alert">{error}</div>
        <button onClick={onRetry} className="btn btn-ghost" style={{ marginTop: 12 }}>Try again</button>
      </main>
    )
  }
  if (!data) {
    return <main className="dash"><p className="dash-muted">Loading your dashboard…</p></main>
  }

  const { stats, resumes, checks, commonGaps } = data

  return (
    <main className="dash">
      <div className="dash-head">
        <div>
          <h1 className="page-title">Welcome back, {greetingName(data)}</h1>
          <p className="dash-muted">{data.user.email}, member since {fmtDate(data.user.createdAt, { month: "long", year: "numeric" })}</p>
        </div>
        <div className="dash-head-actions">
          {currentResume && (
            <button onClick={onContinue} className="btn btn-ghost">Continue editing</button>
          )}
          <button onClick={onNewResume} className="btn btn-primary">
            <Plus size={16} strokeWidth={2.2} />
            New resume
          </button>
        </div>
      </div>

      <dl className="dash-stats">
        <div>
          <dt>Saved resumes</dt>
          <dd>{stats.resumeCount}</dd>
        </div>
        <div>
          <dt>Best ATS match</dt>
          <dd>{stats.bestScore === null ? "None yet" : `${stats.bestScore}%`}</dd>
        </div>
        <div>
          <dt>ATS checks in the last 30 days</dt>
          <dd>{stats.checksThisMonth}</dd>
        </div>
      </dl>

      <div className="dash-grid">
        <div>
          <section className="dash-section">
            <h2 className="dash-h">ATS score history</h2>
            {checks.length === 0 ? (
              <div>
                <p className="dash-muted">No checks yet. Each time you check a resume against a job description, the score is added here so you can see your progress.</p>
                <button onClick={onCheckAts} className="btn btn-ghost btn-sm dash-empty-action">
                  {currentResume ? "Check your ATS match" : "Build a resume to check"}
                </button>
              </div>
            ) : (
              <ScoreChart checks={checks} />
            )}
          </section>

          <section className="dash-section">
            <h2 className="dash-h">Your resumes</h2>
            {resumes.length === 0 ? (
              <div>
                <p className="dash-muted">Nothing saved yet. Build a resume, then choose Save resume above the preview.</p>
                <button onClick={onNewResume} className="btn btn-ghost btn-sm dash-empty-action">Build your first resume</button>
              </div>
            ) : (
              <ul className="dash-list">
                {resumes.map((r) => (
                  <li key={r._id} className="dash-row">
                    <div className="dash-row-main">
                      <p className="saved-name">{r.name}</p>
                      <p className="saved-date">Edited {fmtDate(r.updatedAt, { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <p className="dash-score">
                      {r.latestScore === null ? (
                        <span className="dash-muted">Not scored</span>
                      ) : (
                        <>
                          <span className="dash-dot" style={{ background: scoreBand(r.latestScore).color }} aria-hidden="true"></span>
                          {r.latestScore}% <span className="dash-muted">{scoreBand(r.latestScore).label}</span>
                        </>
                      )}
                    </p>
                    <div className="saved-actions">
                      <button onClick={() => onOpenResume(r)} className="btn btn-ghost btn-sm">Open</button>
                      {confirmDelete === r._id ? (
                        <button onClick={() => { onDeleteResume(r._id); setConfirmDelete(null) }} className="btn btn-danger btn-sm" autoFocus onBlur={() => setConfirmDelete(null)}>Confirm delete</button>
                      ) : (
                        <button onClick={() => setConfirmDelete(r._id)} className="btn btn-danger btn-sm">Delete</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <section className="dash-section">
            <h2 className="dash-h">Keywords you keep missing</h2>
            {commonGaps.length === 0 ? (
              <p className="dash-muted">After a few ATS checks, keywords that job descriptions ask for but your resumes lack will show up here.</p>
            ) : (
              <>
                <p className="dash-muted dash-note">Adding these would help across several of the jobs you checked.</p>
                <ul className="gap-list">
                  {commonGaps.map((g) => (
                    <li key={g.keyword}>
                      <span className="kw-missing">{g.keyword}</span>
                      <span className="dash-muted">missing in {g.count} of {checks.length} checks</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {checks.length > 0 && (
            <section className="dash-section">
              <h2 className="dash-h">Recent checks</h2>
              <ul className="dash-list">
                {checks.slice(0, 6).map((c) => (
                  <li key={c._id} className="check-row">
                    <p className="check-score">{c.score}%</p>
                    <div>
                      <p className="check-job">{c.jobSnippet || "Job description"}</p>
                      <p className="saved-date">{c.resumeName || "Unsaved resume"}, {fmtDate(c.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
