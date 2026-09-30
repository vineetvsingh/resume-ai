import { useState, useRef, useLayoutEffect } from "react"
import { Plus, Check, Trash2, UserRound, FileText, Target } from "lucide-react"

const fmtDate = (d, opts = { day: "numeric", month: "short" }) => new Date(d).toLocaleDateString(undefined, opts)

function scoreBand(score) {
  if (score >= 70) return { label: "Strong", color: "var(--ok)" }
  if (score >= 45) return { label: "Partial", color: "var(--warn)" }
  return { label: "Weak", color: "var(--pen)" }
}

function greetingName(user) {
  return user.profile?.name?.trim().split(/\s+/)[0] || user.email.split("@")[0]
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
  const height = 220
  const pad = { top: 14, right: 14, bottom: 26, left: 34 }
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v) => pad.top + innerH - (v / 100) * innerH
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.score)}`).join(" ")
  const area = points.length > 1 ? `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : ""
  const slot = points.length > 1 ? innerW / (points.length - 1) : innerW
  const activePoint = active !== null ? points[active] : null
  const firstDate = fmtDate(points[0].createdAt)
  const lastDate = fmtDate(points[points.length - 1].createdAt)

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
          <line x1={pad.left} x2={width - pad.right} y1={y(70)} y2={y(70)} className="chart-threshold" />
          <text x={pad.left + 6} y={y(70) - 6} className="chart-axis chart-threshold-label">Strong match (70%)</text>
          <text x={pad.left} y={height - 4} className="chart-axis">{firstDate}</text>
          {points.length > 1 && firstDate !== lastDate && (
            <text x={width - pad.right} y={height - 4} textAnchor="end" className="chart-axis">{lastDate}</text>
          )}
          {area && <path d={area} className="chart-area" />}
          {activePoint && <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} className="chart-crosshair" />}
          <path d={line} className="chart-line" />
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
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(active), 90), width - 90), top: y(activePoint.score) - 12 }}>
          <strong>{activePoint.score}%</strong> {scoreBand(activePoint.score).label} match
          <span>{activePoint.resumeName || "Unsaved resume"}, {fmtDate(activePoint.createdAt)}</span>
        </div>
      )}
    </div>
  )
}

// A miniature of the resume page, drawn from its real content
function Thumbnail({ data }) {
  const skills = (data?.skillsList || []).slice(0, 6)
  const items = [...(data?.projectsList || []), ...(data?.experienceList || [])].slice(0, 3)
  return (
    <div className="thumb" aria-hidden="true">
      <p className="thumb-name">{data?.name || "Untitled"}</p>
      <p className="thumb-contact">{[data?.email, data?.phone].filter(Boolean).join(" / ")}</p>
      {data?.summary && (
        <>
          <p className="thumb-h">Summary</p>
          <p className="thumb-text">{data.summary}</p>
        </>
      )}
      {skills.length > 0 && (
        <>
          <p className="thumb-h">Skills</p>
          <div className="thumb-skills">{skills.map((s, i) => <span key={i}>{s}</span>)}</div>
        </>
      )}
      {items.length > 0 && (
        <>
          <p className="thumb-h">Projects and experience</p>
          {items.map((it, i) => (
            <p key={i} className="thumb-text"><b>{it.name || it.role}</b> {it.desc}</p>
          ))}
        </>
      )}
    </div>
  )
}

function SetupChecklist({ steps }) {
  const done = steps.filter((s) => s.done).length
  return (
    <section className="setup" aria-label="Get set up">
      <div className="setup-head">
        <h2 className="dash-h">Get set up</h2>
        <p className="dash-muted">{done} of {steps.length} done</p>
      </div>
      <ol className="setup-steps">
        {steps.map((s) => {
          const Icon = s.icon
          return (
            <li key={s.title} className={s.done ? "is-done" : undefined}>
              <span className="setup-mark" aria-hidden="true">
                {s.done ? <Check size={15} strokeWidth={3} /> : <Icon size={15} strokeWidth={2} />}
              </span>
              <div>
                <h3 className="setup-title">{s.title}</h3>
                <p className="setup-text">{s.done ? "Done" : s.text}</p>
                {!s.done && (
                  <button onClick={s.onClick} className="btn btn-ghost btn-sm setup-action">{s.action}</button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default function Dashboard({ data, error, currentResume, onContinue, onOpenResume, onDeleteResume, onNewResume, onCheckAts, onEditProfile, onRetry }) {
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

  const { user, stats, resumes, checks, commonGaps } = data
  const latest = checks[0]
  const profile = user.profile || {}

  const steps = [
    {
      title: "Complete your profile",
      text: "Add your phone, college and target role so new resumes start filled in.",
      action: "Edit profile",
      icon: UserRound,
      done: Boolean(profile.name && profile.phone && profile.college),
      onClick: onEditProfile
    },
    {
      title: "Save your first resume",
      text: "Build a resume, then choose Save resume above the preview.",
      action: "Build a resume",
      icon: FileText,
      done: resumes.length > 0,
      onClick: onNewResume
    },
    {
      title: "Run an ATS check",
      text: "Paste a job description to see how well your resume matches it.",
      action: currentResume ? "Check ATS match" : "Build a resume first",
      icon: Target,
      done: checks.length > 0,
      onClick: onCheckAts
    }
  ]
  const setupDone = steps.every((s) => s.done)

  return (
    <main className="dash">
      <div className="dash-head">
        <div>
          <h1 className="dash-title">Welcome back, {greetingName(user)}</h1>
          <p className="dash-muted">
            {latest
              ? `Your last ATS check scored ${latest.score}%, on ${fmtDate(latest.createdAt)}.`
              : resumes.length
                ? `You have ${resumes.length} saved ${resumes.length === 1 ? "resume" : "resumes"}. Check one against a job to track your score.`
                : "Here is where your resumes and ATS progress will live."}
          </p>
        </div>
        <div className="dash-head-actions">
          <button onClick={onEditProfile} className="btn btn-ghost">
            <UserRound size={16} strokeWidth={2} />
            Profile
          </button>
          {currentResume && (
            <button onClick={onContinue} className="btn btn-ghost">Continue editing</button>
          )}
          <button onClick={onNewResume} className="btn btn-primary">
            <Plus size={16} strokeWidth={2.2} />
            New resume
          </button>
        </div>
      </div>

      {!setupDone && <SetupChecklist steps={steps} />}

      <section className="shelf" aria-labelledby="shelf-title">
        <div className="shelf-head">
          <h2 id="shelf-title" className="dash-h">Your resumes</h2>
          {resumes.length > 0 && <p className="dash-muted">{resumes.length} saved</p>}
        </div>
        {resumes.length === 0 && (
          <p className="dash-muted shelf-empty-note">Resumes you save appear here as pages you can open with one click.</p>
        )}
        <ul className={resumes.length === 0 ? "shelf-grid shelf-grid-empty" : "shelf-grid"}>
          {resumes.map((r) => {
            const band = r.latestScore === null ? null : scoreBand(r.latestScore)
            return (
              <li key={r._id} className="shelf-item">
                <button onClick={() => onOpenResume(r)} className="shelf-open" aria-label={`Open ${r.name}`}>
                  <Thumbnail data={r.data} />
                </button>
                <div className="shelf-meta">
                  <div className="shelf-meta-main">
                    <p className="shelf-name" title={r.name}>{r.name}</p>
                    <p className="shelf-sub">
                      {band ? (
                        <><span className="dash-dot" style={{ background: band.color }} aria-hidden="true"></span>{r.latestScore}% {band.label.toLowerCase()} match</>
                      ) : (
                        <>Edited {fmtDate(r.updatedAt)}</>
                      )}
                    </p>
                  </div>
                  {confirmDelete === r._id ? (
                    <button
                      onClick={() => { onDeleteResume(r._id); setConfirmDelete(null) }}
                      onBlur={() => setConfirmDelete(null)}
                      className="btn btn-danger btn-sm"
                      autoFocus
                    >
                      Delete?
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDelete(r._id)} className="icon-btn icon-btn-sm" aria-label={`Delete ${r.name}`} title="Delete">
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
          <li className="shelf-item">
            <button onClick={onNewResume} className="shelf-new">
              <Plus size={22} strokeWidth={2} />
              <span>New resume</span>
            </button>
          </li>
        </ul>
      </section>

      {checks.length === 0 ? (
        <section className="panel panel-empty">
          <h2 className="dash-h">ATS progress</h2>
          <p className="dash-muted">
            Your score history and the keywords you keep missing will appear here after your first ATS check.
          </p>
        </section>
      ) : (
        <>
          <div className="dash-grid">
            <section className="panel">
              <div className="panel-head">
                <h2 className="dash-h">ATS progress</h2>
              </div>
              <dl className="figures">
                <div>
                  <dt>Latest</dt>
                  <dd>{latest.score}%</dd>
                </div>
                <div>
                  <dt>Best</dt>
                  <dd>{stats.bestScore}%</dd>
                </div>
                <div>
                  <dt>Checks in the last 30 days</dt>
                  <dd>{stats.checksThisMonth}</dd>
                </div>
              </dl>
              <ScoreChart checks={checks} />
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2 className="dash-h">Keywords to add</h2>
              </div>
              {commonGaps.length === 0 ? (
                <p className="dash-muted">
                  When the same keyword is missing from two or more jobs you check, it shows up here.
                </p>
              ) : (
                <>
                  <p className="dash-muted dash-note">These came up as missing in more than one job you checked.</p>
                  <ul className="gap-list">
                    {commonGaps.map((g) => (
                      <li key={g.keyword}>
                        <span className="kw-missing">{g.keyword}</span>
                        <span className="gap-count">{g.count} of {checks.length} jobs</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2 className="dash-h">Recent checks</h2>
            </div>
            <ul className="checks">
              {checks.slice(0, 5).map((c) => {
                const band = scoreBand(c.score)
                return (
                  <li key={c._id} className="check">
                    <div className="check-score">
                      <span className="check-num">{c.score}%</span>
                      <span className="check-bar" aria-hidden="true">
                        <span style={{ width: `${c.score}%`, background: band.color }}></span>
                      </span>
                    </div>
                    <div className="check-body">
                      <p className="check-job">{c.jobSnippet || "Job description"}</p>
                      <p className="shelf-sub">{c.resumeName || "Unsaved resume"}, {fmtDate(c.createdAt)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
