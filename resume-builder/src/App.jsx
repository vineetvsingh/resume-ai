import { useState, useEffect, useRef } from "react"
import { flushSync } from "react-dom"
import { Sun, Moon, Sparkles, Target, PenLine, LayoutDashboard, LogOut, PanelLeft, PanelLeftClose } from "lucide-react"
import ResumeForm from "./components/ResumeForm"
import ResumePreview from "./components/ResumePreview"
import ATSScorer from "./components/ATSScorer"
import Suggestions from "./components/Suggestions"
import Footer from "./components/Footer"
import AuthDialog from "./components/AuthDialog"
import Dashboard from "./components/Dashboard"
import Landing from "./components/Landing"
import SidePanel from "./components/SidePanel"
import ProfileSettings from "./components/ProfileSettings"
import Roadmap from "./components/Roadmap"
import VersionBar from "./components/VersionBar"
import VersionDialog from "./components/VersionDialog"
import ConfirmDialog from "./components/ConfirmDialog"
import { api, getToken, setToken, BACKEND_URL } from "./auth"
import { contentOnly, withSettings, getLength, lengthLevel, DEFAULT_LENGTH } from "./resumeLayout"

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
  if (!res.ok) {
    // The server explains failures (for example, the AI being busy); show that instead of a generic error
    const err = new Error(data.error || "The AI could not answer right now.")
    err.userFacing = true
    throw err
  }
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
  // The skill roadmap being viewed: { keyword, data, loading, error }
  const [roadmap, setRoadmap] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const headerRef = useRef(null)

  // Expose the header's real height so the side panel can sit just below it
  useEffect(() => {
    if (!headerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--header-offset", `${entry.target.offsetHeight}px`)
    })
    ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [appLoading])

  function togglePanel() {
    const next = !panelOpen
    setPanelOpen(next)
    if (next && user && !dashboard) loadDashboard()
  }

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
    setResumeMeta(null)
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
  // Saved-resume details for the open resume: { name, parentId, label, target }
  const [resumeMeta, setResumeMeta] = useState(null)
  // The resume as it was before the last AI rewrite, so it can be undone in one step
  const [aiUndo, setAiUndo] = useState(null)
  const [tailoring, setTailoring] = useState(false)
  // Length chosen before generating; once a resume exists, its saved setting is used
  const [lengthChoice, setLengthChoice] = useState(DEFAULT_LENGTH)
  const [lengthBusy, setLengthBusy] = useState(false)
  const currentLength = resume ? getLength(resume) : lengthChoice
  // { mode: "create" | "edit", source } for the version dialog
  const [versionDialog, setVersionDialog] = useState(null)
  // { title, message, confirmLabel, onConfirm } for confirmations
  const [confirm, setConfirm] = useState(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreResult, setScoreResult] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestResult, setSuggestResult] = useState(null)

  async function handleGenerate() {
    if (!formData.name || !formData.skills) return
    setBuildLoading(true)
    setBuildError(null)
    const level = lengthLevel(currentLength)
    try {
      const prompt = `Write a resume for a computer science student in India, using only the details below.
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
College: ${formData.college}
CGPA: ${formData.cgpa}
Skills: ${formData.skills}
Projects: ${formData.projects}
Experience: ${formData.experience}
Target Role: ${formData.role}

Length: ${level.label}. Summary: ${level.summary[0] ? `${level.summary[0]} to ` : "at most "}${level.summary[1]} words. Each project and experience description: ${level.entry[0] ? `${level.entry[0]} to ` : "at most "}${level.entry[1]} words.
Rules:
- Use only the details given above. If there is not enough to reach a minimum, write less. Never invent achievements, numbers, tools, skills, outcomes or impact.
- No filler or self-praise: avoid words like passionate, dynamic, proven, results-driven, user-centric.
- Resume style: no "I" or "my"; start project and experience descriptions with a past-tense verb.
- Do not mention nationality.

Return ONLY a JSON object with no markdown or backticks:
{"name":"","email":"","phone":"","summary":"2 line summary","education":"college | cgpa | year","skillsList":["skill1"],"projectsList":[{"name":"","desc":""}],"experienceList":[{"role":"","company":"","desc":""}]}`

      const response = await callGroq(prompt, "You are a careful resume writer. You only use facts the student gave. Return only valid JSON, no markdown, no backticks.")
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
      // Regenerating keeps the layout the user already chose, with the chosen length
      let generated = { ...data, settings: { ...(resume?.settings || {}), length: level.id } }
      try {
        // The AI sometimes runs over the limits; trim just those parts, keeping every fact
        const fitted = await api("/resume-length", { method: "POST", body: { resume: generated, level: level.id, mode: "fit", source: formData } })
        generated = fitted.resume
      } catch {
        // Keep the untrimmed text rather than failing the whole generation
      }
      setResume(generated)
      setAiUndo(null)
      revealPreview()
    } catch (e) {
      setBuildError(e.userFacing ? e.message : "Something went wrong generating your resume. Please try again.")
    }
    setBuildLoading(false)
  }

  async function handleScore(jd) {
    if (!jd || !resume) return
    setScoreLoading(true)
    setScoreError(null)
    try {
      const prompt = `Compare this resume against the job description.
Resume: ${JSON.stringify(contentOnly(resume))}
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
        }).then(() => { if (dashboard) loadDashboard() }).catch(() => {})
      }
    } catch (e) {
      setScoreError(e.userFacing ? e.message : "Something went wrong analyzing your resume. Please try again.")
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
Resume: ${JSON.stringify(contentOnly(resume))}
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
      setSuggestResult({ suggestions: [], error: e.userFacing ? e.message : "Something went wrong. Try again." })
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
        if (saved?._id) {
          setLoadedResumeId(saved._id)
          setResumeMeta({ name: saved.name, parentId: null, label: "", target: null })
        }
      }
      showSaveNote()
      if (dashboard) loadDashboard()
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
        if (saved?._id) {
          setLoadedResumeId(saved._id)
          setResumeMeta({ name: saved.name, parentId: null, label: "", target: null })
        }
        showSaveNote()
        if (dashboard) loadDashboard()
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
    setResumeMeta(null)
    setAiUndo(null)
    setScoreResult(null)
    setSuggestResult(null)
  }

  function showSaveNote(text = "Saved to your dashboard", ms = 4000) {
    setSaveNote(text)
    setTimeout(() => setSaveNote(null), ms)
  }

  async function fetchRoadmap(keyword) {
    setRoadmap({ keyword, data: null, loading: true, error: null })
    try {
      const data = await api("/roadmaps", { method: "POST", body: { keyword } })
      setRoadmap({ keyword, data, loading: false, error: null })
    } catch (e) {
      setRoadmap({ keyword, data: null, loading: false, error: describeApiError(e, "Could not reach the server. Check that the backend is running.") })
    }
  }

  function openRoadmap(keyword) {
    requireLogin(`Log in to get a learning plan for ${keyword}.`, () => {
      setView("roadmap")
      setPanelOpen(false)
      window.scrollTo({ top: 0 })
      fetchRoadmap(keyword)
    })
  }

  async function toggleRoadmapTask(taskId) {
    const current = roadmap?.data
    if (!current) return
    const done = current.done.includes(taskId) ? current.done.filter((id) => id !== taskId) : [...current.done, taskId]
    setRoadmap((r) => ({ ...r, data: { ...r.data, done } }))
    try {
      const saved = await api(`/roadmaps/${current._id}`, { method: "PATCH", body: { done } })
      setRoadmap((r) => ({ ...r, data: saved }))
    } catch (e) {
      setRoadmap((r) => ({ ...r, data: current, error: null }))
      describeApiError(e, null)
    }
  }

  async function deleteRoadmap(r) {
    try {
      await api(`/roadmaps/${r._id}`, { method: "DELETE" })
      setRoadmap(null)
      goHome()
    } catch (e) {
      describeApiError(e, null)
    }
  }

  // Adds the learned skill and its project to the open resume, or to the most recently edited saved one
  function addRoadmapToResume(r) {
    const saved = dashboard?.resumes?.[0]
    const base = resume || saved?.data
    const p = user?.profile || {}
    const target = base
      ? { ...base }
      : { name: p.name || "", email: user?.email || "", phone: p.phone || "", summary: "", education: [p.college, p.cgpa].filter(Boolean).join(" | "), skillsList: [], projectsList: [], experienceList: [] }
    const skills = target.skillsList || []
    const hasSkill = skills.some((sk) => sk.toLowerCase() === r.keyword.toLowerCase())
    target.skillsList = hasSkill ? skills : [...skills, r.keyword]
    const projects = target.projectsList || []
    const hasProject = projects.some((pr) => pr.name === r.plan.project.title)
    target.projectsList = hasProject ? projects : [...projects, { name: r.plan.project.title, desc: r.plan.resumeLine || r.plan.project.description }]

    setResume(target)
    if (!resume) setLoadedResumeId(saved?._id || null)
    setActiveTab("Build")
    setView("workspace")
    window.scrollTo({ top: 0 })
    revealPreview()
    showSaveNote(`Added ${r.keyword} and your project. Review it, then save.`, 8000)
  }

  async function loadDashboard() {
    setDashboardError(null)
    try {
      setDashboard(await api("/dashboard"))
    } catch (e) {
      setDashboardError(describeApiError(e, "Could not load your dashboard. Check that the backend is running."))
    }
  }

  // On narrow screens the preview sits below the form, so bring it into view
  function revealPreview() {
    if (window.innerWidth > 1024) return
    requestAnimationFrame(() => {
      const desk = document.querySelector(".desk")
      if (!desk) return
      const headerHeight = headerRef.current?.offsetHeight || 0
      window.scrollTo({ top: desk.getBoundingClientRect().top + window.scrollY - headerHeight, behavior: "smooth" })
    })
  }

  function goHome() {
    setView("home")
    setPanelOpen(false)
    window.scrollTo({ top: 0 })
    if (getToken()) loadDashboard()
  }

  function openBuilder(tab = "Build") {
    setActiveTab(tab)
    setView("workspace")
    window.scrollTo({ top: 0 })
  }

  function startNewResume() {
    handleClearResume()
    const p = user?.profile || {}
    setFormData({
      name: p.name || "",
      email: user?.email || "",
      phone: p.phone || "",
      college: p.college || "",
      cgpa: p.cgpa || "",
      skills: "",
      projects: "",
      experience: "",
      role: p.targetRole || ""
    })
    setBuildError(null)
    openBuilder("Build")
  }

  function openProfile() {
    setView("profile")
    setPanelOpen(false)
    window.scrollTo({ top: 0 })
  }

  function handleProfileSaved(nextUser) {
    setUser(nextUser)
    setDashboard((d) => (d ? { ...d, user: nextUser } : d))
  }

  async function deleteResume(id) {
    try {
      await deleteResumeFromDB(id)
      const removed = [id, ...(dashboard?.resumes || []).filter((r) => r.parentId === id).map((r) => r._id)]
      if (removed.includes(loadedResumeId)) {
        setLoadedResumeId(null)
        setResumeMeta(null)
      }
      loadDashboard()
    } catch (e) {
      setDashboardError(describeApiError(e, "Could not delete. Check that the backend is running."))
    }
  }

  const resumeTitle = (r) => r?.label || r?.name || "Untitled resume"

  function handleDeleteResume(r) {
    const versions = r.parentId ? 0 : (dashboard?.resumes || []).filter((v) => v.parentId === r._id).length
    setConfirm({
      title: r.parentId ? "Delete this version?" : "Delete this resume?",
      message: versions
        ? `"${resumeTitle(r)}" and its ${versions} ${versions === 1 ? "version" : "versions"} will be deleted, along with their ATS scores. This cannot be undone.`
        : `"${resumeTitle(r)}" and its ATS scores will be deleted. This cannot be undone.`,
      confirmLabel: versions ? `Delete resume and ${versions} ${versions === 1 ? "version" : "versions"}` : "Delete",
      onConfirm: () => deleteResume(r._id)
    })
  }

  async function handleDuplicateResume(r) {
    try {
      await api(`/resumes/${r._id}/duplicate`, { method: "POST" })
      loadDashboard()
    } catch (e) {
      setDashboardError(describeApiError(e, "Could not duplicate. Check that the backend is running."))
    }
  }

  // The saved resume a dialog acts on: from the dashboard, or the one open in the builder
  function openedAsSaved() {
    return loadedResumeId && resumeMeta ? { _id: loadedResumeId, ...resumeMeta, data: resume } : null
  }

  function masterTitleFor(r) {
    if (!r?.parentId) return resumeTitle(r)
    return resumeTitle((dashboard?.resumes || []).find((m) => m._id === r.parentId))
  }

  async function submitVersionDialog(fields, { tailorNow }) {
    const { mode, source } = versionDialog
    try {
      if (mode === "create") {
        // From the builder, the version starts from what is on screen, including unsaved edits
        const fromBuilder = source._id === loadedResumeId
        const created = await api(`/resumes/${source._id}/versions`, {
          method: "POST",
          body: { ...fields, ...(fromBuilder && resume ? { data: resume } : {}) }
        })
        setVersionDialog(null)
        handleLoadResume(created)
        loadDashboard()
        if (tailorNow) tailorResume(created.data, fields.target.jobDescription)
        else showSaveNote(`Created "${created.label}". Changes here never affect the original.`, 6000)
      } else {
        const updated = await api(`/resumes/${source._id}`, { method: "PATCH", body: fields })
        setVersionDialog(null)
        if (source._id === loadedResumeId) {
          setResumeMeta({ name: updated.name, parentId: updated.parentId || null, label: updated.label || "", target: updated.target || null })
        }
        loadDashboard()
      }
      return null
    } catch (e) {
      return describeApiError(e, "Could not save. Check that the backend is running.") || "Log in again to continue."
    }
  }

  // Rewrites the summary and reorders entries for the version's job, keeping every fact
  async function tailorResume(base = resume, jobDescription = resumeMeta?.target?.jobDescription) {
    if (!base || !jobDescription) return
    setTailoring(true)
    try {
      const out = await api("/tailor", { method: "POST", body: { resume: base, jobDescription } })
      const reorder = (list, order) => (list ? order.map((i) => list[i]).filter(Boolean) : list)
      setAiUndo({ resume: base, label: "Tailored to this job" })
      setResume({
        ...base,
        summary: out.summary,
        skillsList: reorder(base.skillsList, out.skillsOrder),
        projectsList: reorder(base.projectsList, out.projectsOrder),
        experienceList: reorder(base.experienceList, out.experienceOrder)
      })
      showSaveNote(out.summaryKept
        ? "Reordered your skills and projects for this job. Your summary was kept, since a rewrite would have added things not on your resume."
        : "Tailored to this job using only what was already on your resume. Review it, then save.", 9000)
    } catch (e) {
      setBuildError(describeApiError(e, "Could not tailor. Check that the backend is running."))
    }
    setTailoring(false)
  }

  async function changeLength(id) {
    if (!resume) {
      setLengthChoice(id)
      return
    }
    if (id === currentLength || lengthBusy) return
    const level = lengthLevel(id)
    setLengthBusy(true)
    setBuildError(null)
    try {
      const out = await api("/resume-length", { method: "POST", body: { resume, level: id, mode: "rewrite", source: formData } })
      setAiUndo({ resume, label: `Changed length to ${level.label}` })
      setResume(withSettings(out.resume, { length: id }))
      setLengthChoice(id)
      showSaveNote(out.kept?.length
        ? `Rewritten as ${level.label}. ${out.kept.length === 1 ? "One line was kept as it was" : `${out.kept.length} lines were kept as they were`}, since rewriting it safely was not possible without adding things that are not on your resume.`
        : `Rewritten as ${level.label}, keeping every fact. Review it, then save.`, 9000)
    } catch (e) {
      setBuildError(describeApiError(e, "Could not change the length. Check that the backend is running."))
    }
    setLengthBusy(false)
  }

  function undoAiChange() {
    if (!aiUndo) return
    setResume(aiUndo.resume)
    setAiUndo(null)
    showSaveNote("Undone. Your resume is back to how it was.")
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
    setResumeMeta({ name: r.name, parentId: r.parentId || null, label: r.label || "", target: r.target || null })
    setAiUndo(null)
    setScoreResult(null)
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
    window.scrollTo({ top: 0 })
    revealPreview()
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
      <header className="header" ref={headerRef}>
        <div className="header-start">
          <button
            onClick={togglePanel}
            className="icon-btn"
            aria-expanded={panelOpen}
            aria-controls="side-panel"
            aria-label={panelOpen ? "Close menu" : "Open menu"}
            title={panelOpen ? "Close menu" : "Open menu"}
          >
            {panelOpen ? <PanelLeftClose size={17} strokeWidth={2} /> : <PanelLeft size={17} strokeWidth={2} />}
          </button>
          <button className="wordmark wordmark-btn" onClick={goHome} aria-label="ResumeAI home">
            <span className="wordmark-glyph" aria-hidden="true"></span>
            ResumeAI
          </button>
        </div>

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

      {view === "roadmap" && roadmap ? (
        <Roadmap
          keyword={roadmap.keyword}
          roadmap={roadmap.data}
          loading={roadmap.loading}
          error={roadmap.error}
          jobsAsking={dashboard?.commonGaps?.find((g) => g.keyword.toLowerCase() === roadmap.keyword.toLowerCase())?.count || 0}
          onToggle={toggleRoadmapTask}
          onAddToResume={addRoadmapToResume}
          onDelete={deleteRoadmap}
          onRetry={() => fetchRoadmap(roadmap.keyword)}
          onBack={goHome}
        />
      ) : view === "profile" && user ? (
        <ProfileSettings user={user} onSaved={handleProfileSaved} onBack={goHome} />
      ) : view === "home" || view === "profile" ? (
        user ? (
          <Dashboard
            data={dashboard}
            error={dashboardError}
            currentResume={resume}
            onContinue={() => openBuilder("Build")}
            onOpenResume={handleLoadResume}
            onDeleteResume={handleDeleteResume}
            onDuplicateResume={handleDuplicateResume}
            onNewVersion={(r) => setVersionDialog({ mode: "create", source: r })}
            onEditDetails={(r) => setVersionDialog({ mode: "edit", source: r })}
            onNewResume={startNewResume}
            onCheckAts={() => openBuilder(resume ? "ATS Score" : "Build")}
            onEditProfile={openProfile}
            onPlan={openRoadmap}
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
              <ResumeForm
                formData={formData}
                setFormData={setFormData}
                onGenerate={handleGenerate}
                onClear={handleClearForm}
                loading={buildLoading}
                length={currentLength}
                onLengthChange={changeLength}
                lengthBusy={lengthBusy}
                hasResume={Boolean(resume)}
              />
            )}
            {activeTab === "ATS Score" && (
              <ATSScorer
                key={loadedResumeId || "unsaved"}
                initialJd={resumeMeta?.target?.jobDescription || ""}
                onScore={handleScore}
                loading={scoreLoading}
                result={scoreResult}
                onPlan={openRoadmap}
              />
            )}
            {activeTab === "Suggestions" && (
              <Suggestions onSuggest={handleSuggest} loading={suggestLoading} result={suggestResult} />
            )}

            {activeError && <div className="alert" role="alert">{activeError}</div>}
          </div>
        </section>

        <section className="desk" aria-label="Resume preview">
          {resume && loadedResumeId && resumeMeta && (
            <VersionBar
              meta={resumeMeta}
              masterTitle={masterTitleFor(resumeMeta)}
              tailoring={tailoring}
              onNewVersion={() => setVersionDialog({ mode: "create", source: openedAsSaved() })}
              onEditDetails={() => setVersionDialog({ mode: "edit", source: openedAsSaved() })}
              onTailor={() => tailorResume()}
            />
          )}
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
            undo={aiUndo ? { label: aiUndo.label, onUndo: undoAiChange } : null}
            length={currentLength}
            onLengthChange={changeLength}
            lengthBusy={lengthBusy}
          />
        </section>
      </main>
      )}

      {versionDialog && (
        <VersionDialog
          mode={versionDialog.mode}
          isVersion={Boolean(versionDialog.source.parentId)}
          masterTitle={`"${resumeTitle(versionDialog.source)}"`}
          initial={versionDialog.mode === "edit" ? versionDialog.source : null}
          onSubmit={submitVersionDialog}
          onClose={() => setVersionDialog(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {authPrompt && (
        <AuthDialog
          reason={authPrompt.reason}
          onClose={() => setAuthPrompt(null)}
          onAuthed={handleAuthed}
        />
      )}

      <SidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        view={view}
        activeTab={activeTab}
        user={user}
        resumes={dashboard?.resumes}
        loadedResumeId={loadedResumeId}
        onHome={goHome}
        onOpenTab={openBuilder}
        onOpenResume={handleLoadResume}
        onLogin={() => setAuthPrompt({ action: goHome })}
        onLogout={handleLogout}
        onProfile={openProfile}
      />

      {view === "home" && <Footer />}
    </div>
  )
}
