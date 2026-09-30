import { useState, useEffect } from "react"
import { flushSync } from "react-dom"
import { Sun, Moon, Sparkles, Target, PenLine, LayoutDashboard, LogOut } from "lucide-react"
import ResumeForm from "./components/ResumeForm"
import ResumePreview from "./components/ResumePreview"
import ATSScorer from "./components/ATSScorer"
import Suggestions from "./components/Suggestions"
import Footer from "./components/Footer"
import AuthDialog from "./components/AuthDialog"
import Dashboard from "./components/Dashboard"
import Landing from "./components/Landing"
import { api, getToken, setToken, BACKEND_URL } from "./auth"

const TABS = ["Build", "ATS Score", "Suggestions"]

const TAB_COPY = {
  "Build": { title: "Build your resume", lede: "Add your details and we will draft a clean, one-page resume you can edit line by line." },
  "ATS Score": { title: "Check your ATS match", lede: "Paste a job description to see which keywords your resume already covers and which it misses." },
  "Suggestions": { title: "Improve your resume", lede: "Describe the role you want. You will get specific rewrites for weak or missing lines." }
}

async function callGroq(prompt, systemPrompt) {
  const res = await fetch(`${BACKEND_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemPrompt })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ""
}

const saveResumeToDB = (name, data) => api("/resumes", { method: "POST", body: { name, data } })
const updateResumeInDB = (id, name, data) => api(`/resumes/${id}`, { method: "PUT", body: { name, data } })
const deleteResumeFromDB = (id) => api(`/resumes/${id}`, { method: "DELETE" })

export default function App() {
  const [activeTab, setActiveTab] = useState("Build")
  const [themeMode, setThemeMode] = useState("dark")
  const [appLoading, setAppLoading] = useState(true)

  const [buildError, setBuildError] = useState(null)
  const [scoreError, setScoreError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setAppLoading(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  const [view, setView] = useState("home")
  const [dashboard, setDashboard] = useState(null)
  const [dashboardError, setDashboardError] = useState(null)
  const [saveNote, setSaveNote] = useState(null)

  const [user, setUser] = useState(null)
  const [authPrompt, setAuthPrompt] = useState(null)
  const [authChecking, setAuthChecking] = useState(() => !!getToken())

  useEffect(() => {
    if (!getToken()) return
    api("/auth/me")
      .then((data) => {
        setUser(data.user)
        loadDashboard()
      })
      .catch(() => setToken(null))
      .finally(() => setAuthChecking(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Runs `action` now if logged in, otherwise after the user logs in
  function requireLogin(reason, action) {
    if (user) action()
    else setAuthPrompt({ reason, action })
  }

  function handleAuthed(nextUser) {
    setUser(nextUser)
    const action = authPrompt?.action
    setAuthPrompt(null)
    if (action) action()
  }

  function handleLogout() {
    setToken(null)
    setUser(null)
    setDashboard(null)
    setView("home")
    setLoadedResumeId(null)
  }

  // Returns a message for the user; on an expired session, also asks them to log in again
  function describeApiError(e, fallback) {
    if (e.status === 401) {
      setToken(null)
      setUser(null)
      setAuthPrompt({ reason: e.message })
      return null
    }
    return e.status ? e.message : fallback
  }

  const [formData, setFormData] = useState({ name: "", email: "", phone: "", college: "", cgpa: "", skills: "", projects: "", experience: "", role: "" })

  const [resume, setResume] = useState(null)
  const [loadedResumeId, setLoadedResumeId] = useState(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreResult, setScoreResult] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestResult, setSuggestResult] = useState(null)

  async function handleGenerate() {
    if (!formData.name || !formData.skills) return
    setBuildLoading(true)
    setBuildError(null)
    try {
      const prompt = `Generate a resume for an Indian CS student:
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
College: ${formData.college}
CGPA: ${formData.cgpa}
Skills: ${formData.skills}
Projects: ${formData.projects}
Experience: ${formData.experience}
Target Role: ${formData.role}

Return ONLY a JSON object with no markdown or backticks:
{"name":"","email":"","phone":"","summary":"2 line summary","education":"college | cgpa | year","skillsList":["skill1"],"projectsList":[{"name":"","desc":""}],"experienceList":[{"role":"","company":"","desc":""}]}`

      const response = await callGroq(prompt, "You are a professional resume writer for Indian CS students. Return only valid JSON, no markdown, no backticks.")
      const clean = response.replace(/```json|```/g, "").trim()
      let data
      try {
        data = JSON.parse(clean)
      } catch(e) {
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) {
          data = JSON.parse(match[0])
        } else {
          throw new Error("Could not parse AI response")
        }
      }
      setResume(data)
    } catch (e) {
      setBuildError("Something went wrong generating your resume. Please try again.")
    }
    setBuildLoading(false)
  }

  async function handleScore(jd) {
    if (!jd || !resume) return
    setScoreLoading(true)
    setScoreError(null)
    try {
      const prompt = `Compare this resume against the job description.
Resume: ${JSON.stringify(resume)}
Job Description: ${jd}

Return ONLY a JSON object with no markdown or backticks:
{"score":75,"foundKeywords":["keyword1"],"missingKeywords":["keyword2"],"summary":"2 sentence assessment"}`

      const response = await callGroq(prompt, "You are an ATS analyzer. Return only valid JSON, no markdown, no backticks.")
      const clean = response.replace(/```json|```/g, "").trim()
      let data
      try {
        data = JSON.parse(clean)
      } catch(e) {
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) {
          data = JSON.parse(match[0])
        } else {
          throw new Error("Could not parse AI response")
        }
      }
      setScoreResult(data)
      if (user && typeof data.score === "number") {
        api("/scores", {
          method: "POST",
          body: {
            resumeId: loadedResumeId,
            resumeName: resume.name,
            jobDescription: jd,
            score: data.score,
            foundKeywords: data.foundKeywords,
            missingKeywords: data.missingKeywords
          }
        }).catch(() => {})
      }
    } catch (e) {
      setScoreError("Something went wrong analyzing your resume. Please try again.")
    }
    setScoreLoading(false)
  }

  async function handleSuggest(context) {
    if (!resume) {
      setSuggestResult({ suggestions: [], error: "Please generate a resume first from the Build tab." })
      return
    }
    setSuggestLoading(true)
    try {
      const prompt = `Give specific resume improvements for this student.
Resume: ${JSON.stringify(resume)}
Target: ${context || "general software engineering roles"}

Return ONLY a JSON object with no markdown or backticks:
{"suggestions":[{"section":"Skills/Projects/Experience/Summary","original":"existing weak text or empty if missing","improved":"specific stronger text to add or replace"}]}`

      const response = await callGroq(prompt, "You are a resume coach for Indian CS students. Return only valid JSON, no markdown, no backticks.")
      const clean = response.replace(/```json|```/g, "").trim()
      let data
      try {
        data = JSON.parse(clean)
      } catch(e) {
        const match = clean.match(/\{[\s\S]*\}/)
        data = match ? JSON.parse(match[0]) : { suggestions: [] }
      }
      setSuggestResult(data)
    } catch (e) {
      setSuggestResult({ suggestions: [], error: "Something went wrong. Try again." })
    }
    setSuggestLoading(false)
  }

  function handleSaveResume() {
    if (!resume) {
      setBuildError("Generate a resume first before saving.")
      setActiveTab("Build")
      return
    }
    requireLogin("Log in to save your resume. Only you will be able to see it.", saveResume)
  }

  async function saveResume() {
    try {
      if (loadedResumeId) {
        await updateResumeInDB(loadedResumeId, resume.name, resume)
      } else {
        const saved = await saveResumeToDB(resume.name, resume)
        if (saved?._id) setLoadedResumeId(saved._id)
      }
      showSaveNote()
    } catch (e) {
      setBuildError(describeApiError(e, "Could not save. Check that the backend is running."))
    }
  }

  function handleSaveAsNew() {
    if (!resume) {
      setBuildError("Generate a resume first before saving.")
      setActiveTab("Build")
      return
    }
    requireLogin("Log in to save your resume. Only you will be able to see it.", async () => {
      try {
        const saved = await saveResumeToDB(resume.name, resume)
        if (saved?._id) setLoadedResumeId(saved._id)
        showSaveNote()
      } catch (e) {
        setBuildError(describeApiError(e, "Could not save. Check that the backend is running."))
      }
    })
  }

  function handleClearForm() {
    setFormData({
      name: "",
      email: "",
      phone: "",
      college: "",
      cgpa: "",
      skills: "",
      projects: "",
      experience: "",
      role: ""
    })
    setBuildError(null)
  }

  function handleClearResume() {
    setResume(null)
    setLoadedResumeId(null)
    setScoreResult(null)
    setSuggestResult(null)
  }

  function showSaveNote() {
    setSaveNote("Saved to your dashboard")
    setTimeout(() => setSaveNote(null), 4000)
  }

  async function loadDashboard() {
    setDashboardError(null)
    try {
      setDashboard(await api("/dashboard"))
    } catch (e) {
      setDashboardError(describeApiError(e, "Could not load your dashboard. Check that the backend is running."))
    }
  }

  function goHome() {
    setView("home")
    if (getToken()) loadDashboard()
  }

  function openBuilder(tab = "Build") {
    setActiveTab(tab)
    setView("workspace")
  }

  function startNewResume() {
    handleClearResume()
    handleClearForm()
    openBuilder("Build")
  }

  async function handleDeleteResume(id) {
    try {
      await deleteResumeFromDB(id)
      if (loadedResumeId === id) setLoadedResumeId(null)
      loadDashboard()
    } catch (e) {
      setDashboardError(describeApiError(e, "Could not delete. Check that the backend is running."))
    }
  }

  const tabIcons = {
    "Build": <Sparkles size={15} strokeWidth={2} />,
    "ATS Score": <Target size={15} strokeWidth={2} />,
    "Suggestions": <PenLine size={15} strokeWidth={2} />
  }

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  const toggleTheme = (e) => {
    const next = themeMode === "dark" ? "light" : "dark"
    const apply = () => {
      document.documentElement.dataset.theme = next
      flushSync(() => setThemeMode(next))
    }
    if (!document.startViewTransition) {
      apply()
      return
    }
    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )
    const transition = document.startViewTransition(apply)
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 600,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)"
        }
      )
    })
  }

  function handleLoadResume(r) {
    setResume(r.data)
    setLoadedResumeId(r._id)
    setFormData({
      name: r.data.name || "",
      email: r.data.email || "",
      phone: r.data.phone || "",
      college: r.data.education?.split("|")[0]?.trim() || "",
      cgpa: r.data.education?.split("|")[1]?.trim() || "",
      skills: (r.data.skillsList || []).join(", "),
      projects: (r.data.projectsList || []).map(p => `${p.name}: ${p.desc}`).join(". "),
      experience: (r.data.experienceList || []).map(e => `${e.role} at ${e.company}: ${e.desc}`).join(". "),
      role: ""
    })
    setView("workspace")
    setActiveTab("Build")
  }

  if (appLoading) {
    return (
      <div className="splash">
        <span className="wordmark wordmark-lg">
          <span className="wordmark-glyph" aria-hidden="true"></span>
          ResumeAI
        </span>
        <div className="splash-bar" aria-hidden="true"></div>
        <p className="splash-note">Opening your workspace</p>
      </div>
    )
  }

  const activeError =
    activeTab === "Build" ? buildError :
    activeTab === "ATS Score" ? scoreError :
    suggestResult?.error

  return (
    <div>
      <header className="header">
        <button className="wordmark wordmark-btn" onClick={goHome} aria-label="ResumeAI home">
          <span className="wordmark-glyph" aria-hidden="true"></span>
          ResumeAI
        </button>

        {view === "workspace" && (
        <nav className="tabs" role="tablist" aria-label="Resume builder">
          {TABS.map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className="tab"
              onClick={() => setActiveTab(tab)}
            >
              {tabIcons[tab]}
              <span className="tab-label">{tab}</span>
            </button>
          ))}
        </nav>
        )}

        <div className="header-actions">
          {view === "workspace" && (
            <button onClick={goHome} className="btn btn-ghost btn-sm">
              <LayoutDashboard size={15} strokeWidth={2} />
              <span className="header-save-label">{user ? "Dashboard" : "Home"}</span>
            </button>
          )}
          {user ? (
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" title={`Logged in as ${user.email}`}>
              <LogOut size={15} strokeWidth={2} />
              <span className="header-save-label">Log out</span>
            </button>
          ) : (
            <button onClick={() => setAuthPrompt({ action: goHome })} className="btn btn-ghost btn-sm">Log in</button>
          )}
          <button
            onClick={toggleTheme}
            className="icon-btn"
            aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
          >
            {themeMode === "dark" ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
          </button>
        </div>
      </header>

      {view === "home" ? (
        user ? (
          <Dashboard
            data={dashboard}
            error={dashboardError}
            currentResume={resume}
            onContinue={() => openBuilder("Build")}
            onOpenResume={handleLoadResume}
            onDeleteResume={handleDeleteResume}
            onNewResume={startNewResume}
            onCheckAts={() => openBuilder(resume ? "ATS Score" : "Build")}
            onRetry={loadDashboard}
          />
        ) : authChecking ? (
          <main className="dash"><p className="dash-muted">Loading your dashboard…</p></main>
        ) : (
          <Landing currentResume={resume} onStart={startNewResume} onContinue={() => openBuilder("Build")} onLogin={() => setAuthPrompt({ action: goHome })} />
        )
      ) : (
      <main className="layout">
        <section className="workspace">
          <div className="workspace-inner">
            <h1 className="page-title">{TAB_COPY[activeTab].title}</h1>
            <p className="page-lede">{TAB_COPY[activeTab].lede}</p>

            {activeTab === "Build" && (
              <ResumeForm formData={formData} setFormData={setFormData} onGenerate={handleGenerate} onClear={handleClearForm} loading={buildLoading} />
            )}
            {activeTab === "ATS Score" && (
              <ATSScorer onScore={handleScore} loading={scoreLoading} result={scoreResult} />
            )}
            {activeTab === "Suggestions" && (
              <Suggestions onSuggest={handleSuggest} loading={suggestLoading} result={suggestResult} />
            )}

            {activeError && <div className="alert" role="alert">{activeError}</div>}
          </div>
        </section>

        <section className="desk" aria-label="Resume preview">
          <ResumePreview
            resume={resume}
            onScoreClick={() => setActiveTab("ATS Score")}
            onSaveClick={handleSaveResume}
            onSaveAsNewClick={handleSaveAsNew}
            onClearClick={handleClearResume}
            isLoaded={!!loadedResumeId}
            generating={buildLoading}
            onResumeChange={setResume}
            saveNote={saveNote}
          />
        </section>
      </main>
      )}

      {authPrompt && (
        <AuthDialog
          reason={authPrompt.reason}
          onClose={() => setAuthPrompt(null)}
          onAuthed={handleAuthed}
        />
      )}

      <Footer />
    </div>
  )
}
