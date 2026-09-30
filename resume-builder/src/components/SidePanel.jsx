import { useEffect } from "react"
import { LayoutDashboard, Sparkles, Target, PenLine, FileText, LogOut, LogIn, UserRound } from "lucide-react"

const BUILDER_LINKS = [
  { tab: "Build", icon: Sparkles },
  { tab: "ATS Score", icon: Target },
  { tab: "Suggestions", icon: PenLine }
]

export default function SidePanel({ open, onClose, view, activeTab, user, resumes, loadedResumeId, onHome, onOpenTab, onOpenResume, onLogin, onLogout, onProfile }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Every action closes the panel after navigating
  const go = (fn) => () => { fn(); onClose() }

  return (
    <>
      <div className={`panel-scrim${open ? " is-open" : ""}`} onClick={onClose} aria-hidden="true"></div>
      <aside
        id="side-panel"
        className={`side-panel${open ? " is-open" : ""}`}
        aria-label="Navigation"
        inert={!open}
      >
        <nav className="panel-section">
          <button
            className="panel-link"
            aria-current={view === "home" ? "page" : undefined}
            onClick={go(onHome)}
          >
            <LayoutDashboard size={16} strokeWidth={2} />
            {user ? "Dashboard" : "Home"}
          </button>
          {BUILDER_LINKS.map(({ tab, icon: Icon }) => (
            <button
              key={tab}
              className="panel-link"
              aria-current={view === "workspace" && activeTab === tab ? "page" : undefined}
              onClick={go(() => onOpenTab(tab))}
            >
              <Icon size={16} strokeWidth={2} />
              {tab}
            </button>
          ))}
        </nav>

        <div className="panel-section">
          <h2 className="panel-h">Your resumes</h2>
          {!user ? (
            <p className="panel-muted">Log in to keep your resumes here.</p>
          ) : !resumes ? (
            <p className="panel-muted">Loading…</p>
          ) : resumes.length === 0 ? (
            <p className="panel-muted">Nothing saved yet.</p>
          ) : (
            <ul className="panel-list">
              {resumes.map((r) => (
                <li key={r._id}>
                  <button
                    className="panel-link panel-resume"
                    aria-current={loadedResumeId === r._id ? "true" : undefined}
                    onClick={go(() => onOpenResume(r))}
                  >
                    <FileText size={16} strokeWidth={2} />
                    <span>{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel-foot">
          {user ? (
            <>
              <p className="panel-muted panel-email">{user.profile?.name || user.email}</p>
              <button
                className="panel-link"
                aria-current={view === "profile" ? "page" : undefined}
                onClick={go(onProfile)}
              >
                <UserRound size={16} strokeWidth={2} />
                Profile settings
              </button>
              <button className="panel-link" onClick={go(onLogout)}>
                <LogOut size={16} strokeWidth={2} />
                Log out
              </button>
            </>
          ) : (
            <button className="panel-link" onClick={go(onLogin)}>
              <LogIn size={16} strokeWidth={2} />
              Log in
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
