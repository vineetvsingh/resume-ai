import { useState, useEffect } from "react"
import { Sun, Moon, Sparkles, Target, Lightbulb } from "lucide-react"
import ResumeForm from "./components/ResumeForm"
import ResumePreview from "./components/ResumePreview"
import ATSScorer from "./components/ATSScorer"
import Suggestions from "./components/Suggestions"
import Footer from "./components/Footer"

const TABS = ["Build", "ATS Score", "Suggestions"]

async function callGroq(prompt, systemPrompt) {
  const res = await fetch("http://localhost:5000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemPrompt })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ""
}

const BACKEND_URL = "http://localhost:5000"

async function saveResumeToDB(name, data) {
  const res = await fetch(`${BACKEND_URL}/resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data })
  })
  return await res.json()
}

async function fetchResumesFromDB() {
  const res = await fetch(`${BACKEND_URL}/resumes`)
  return await res.json()
}

async function updateResumeInDB(id, name, data) {
  const res = await fetch(`${BACKEND_URL}/resumes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data })
  })
  return await res.json()
}

async function deleteResumeFromDB(id) {
  await fetch(`${BACKEND_URL}/resumes/${id}`, { method: "DELETE" })
}

const themes = {
  dark: {
    bg: "#0f0f0f",
    bgSecondary: "#0a0a0a",
    headerBorder: "#1e1e1e",
    panelBorder: "#1e1e1e",
    text: "#ffffff",
    textSecondary: "#888",
    textMuted: "#555",
    inputBg: "#1a1a1a",
    inputBorder: "#2a2a2a",
    inputText: "#e0e0e0",
    tabBg: "#1a1a1a",
    tabActive: "#ffffff",
    tabActiveText: "#0f0f0f",
    tabInactive: "#888",
    buttonBg: "#ffffff",
    buttonText: "#0f0f0f",
    logoBg: "#ffffff",
    logoText: "#0f0f0f",
    badgeBg: "#1a1a1a",
    badgeBorder: "#2a2a2a",
    badgeText: "#888",
    resumeCardBg: "#ffffff",
    resumeText: "#111",
    resumeTextSecondary: "#444",
    resumeMuted: "#777",
    skillChipBg: "#f5f5f5",
    skillChipText: "#333",
    secondaryButtonBorder: "#2a2a2a",
    secondaryButtonText: "#888",
  },
  light: {
    bg: "#f5f3ef",
    bgSecondary: "#ebe8e2",
    headerBorder: "#dcd8d0",
    panelBorder: "#dcd8d0",
    text: "#1a1a1a",
    textSecondary: "#555",
    textMuted: "#999",
    inputBg: "#ffffff",
    inputBorder: "#dcd8d0",
    inputText: "#1a1a1a",
    tabBg: "#e5e2dc",
    tabActive: "#1a1a1a",
    tabActiveText: "#ffffff",
    tabInactive: "#666",
    buttonBg: "#1a1a1a",
    buttonText: "#ffffff",
    logoBg: "#1a1a1a",
    logoText: "#ffffff",
    badgeBg: "#ffffff",
    badgeBorder: "#dcd8d0",
    badgeText: "#222",
    resumeCardBg: "#ffffff",
    resumeText: "#111",
    resumeTextSecondary: "#444",
    resumeMuted: "#777",
    skillChipBg: "#f0ede6",
    skillChipText: "#333",
    secondaryButtonBorder: "#dcd8d0",
    secondaryButtonText: "#555",
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Build")
  const [themeMode, setThemeMode] = useState("dark")
  const [appLoading, setAppLoading] = useState(true)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const [buildError, setBuildError] = useState(null)
  const [scoreError, setScoreError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setAppLoading(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  const [savedResumes, setSavedResumes] = useState([])
  const [showSaved, setShowSaved] = useState(false)
  const theme = themes[themeMode]

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

  async function handleSaveResume() {
    if (!resume) {
      setBuildError("Generate a resume first before saving.")
      setActiveTab("Build")
      return
    }
    try {
      if (loadedResumeId) {
        await updateResumeInDB(loadedResumeId, resume.name, resume)
      } else {
        const saved = await saveResumeToDB(resume.name, resume)
        if (saved?._id) setLoadedResumeId(saved._id)
      }
      handleFetchResumes()
    } catch (e) {
      setBuildError("Failed to save. Make sure backend is running.")
    }
  }

  async function handleSaveAsNew() {
    if (!resume) {
      setBuildError("Generate a resume first before saving.")
      setActiveTab("Build")
      return
    }
    try {
      const saved = await saveResumeToDB(resume.name, resume)
      if (saved?._id) setLoadedResumeId(saved._id)
      handleFetchResumes()
    } catch (e) {
      setBuildError("Failed to save. Make sure backend is running.")
    }
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

  async function handleFetchResumes() {
    try {
      const data = await fetchResumesFromDB()
      setSavedResumes(data)
      setShowSaved(true)
    } catch (e) {
      setSavedResumes([])
    }
  }

  async function handleDeleteResume(id) {
    try {
      await deleteResumeFromDB(id)
      if (loadedResumeId === id) setLoadedResumeId(null)
      handleFetchResumes()
    } catch (e) {
      console.error("Failed to delete resume")
    }
  }

  const tabIcons = {
    "Build": <Sparkles size={14} strokeWidth={2} />,
    "ATS Score": <Target size={14} strokeWidth={2} />,
    "Suggestions": <Lightbulb size={14} strokeWidth={2} />
  }

  const toggleTheme = (e) => {
    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )
    if (!document.startViewTransition) {
      setThemeMode(themeMode === "dark" ? "light" : "dark")
      return
    }
    const transition = document.startViewTransition(() => {
      setThemeMode(themeMode === "dark" ? "light" : "dark")
    })
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

  const headerBtnStyle = {
    fontSize: "12px",
    padding: "7px 14px",
    borderRadius: "8px",
    border: `1px solid ${theme.inputBorder}`,
    background: "transparent",
    color: theme.textSecondary,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 500
  }

  if (appLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: theme.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ width: "60px", height: "60px", background: theme.logoBg, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: theme.logoText, animation: "pulse 1.5s ease-in-out infinite" }}>
          <Sparkles size={32} strokeWidth={2.2} />
        </div>
        <p style={{ color: theme.text, fontSize: "16px", fontWeight: 600, letterSpacing: "-0.02em" }}>ResumeAI</p>
        <p style={{ color: theme.textMuted, fontSize: "12px", marginTop: "-12px" }}>Loading your workspace...</p>
      </div>
    )
  }

  return (
    <div className="app-fade-in" style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Inter', system-ui, sans-serif", transition: "background 0.3s" }}>
      <div style={{
        borderBottom: `1px solid ${theme.headerBorder}`,
        padding: isMobile ? "12px 16px" : "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: theme.bg,
        zIndex: 40,
        flexWrap: isMobile ? "wrap" : "nowrap",
        gap: isMobile ? "12px" : "0"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", background: theme.logoBg, borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", color: theme.logoText }}>
            <Sparkles size={22} strokeWidth={2.2} />
          </div>
          <span style={{ color: theme.text, fontWeight: 700, fontSize: "18px", letterSpacing: "-0.02em" }}>ResumeAI</span>
        </div>

        <div style={{ position: "relative", display: "flex", gap: "0", background: theme.tabBg, borderRadius: "10px", padding: "4px", order: isMobile ? 3 : 0, width: isMobile ? "100%" : "auto" }}>
          <div style={{
            position: "absolute",
            top: "4px",
            left: isMobile ? `calc(${(TABS.indexOf(activeTab) / 3) * 100}% + 4px)` : `${4 + TABS.indexOf(activeTab) * 140}px`,
            width: isMobile ? "calc(33.33% - 4px)" : "140px",
            height: "calc(100% - 8px)",
            background: theme.tabActive,
            borderRadius: "7px",
            transition: "left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: 0
          }}></div>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                position: "relative",
                padding: "7px 16px",
                fontSize: "13px",
                fontWeight: 500,
                borderRadius: "7px",
                border: "none",
                cursor: "pointer",
                transition: "color 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                background: "transparent",
                color: activeTab === tab ? theme.tabActiveText : theme.tabInactive,
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                width: isMobile ? "33.33%" : "140px",
                fontSize: isMobile ? "12px" : "13px",
                padding: isMobile ? "7px 4px" : "7px 16px",
                zIndex: 1
              }}
            >
              <span>{tabIcons[tab]}</span>
              <span>{tab}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={handleFetchResumes} style={headerBtnStyle}>Saved Resumes</button>
          <div style={{ fontSize: "11px", color: theme.badgeText, background: theme.badgeBg, border: `1px solid ${theme.badgeBorder}`, padding: "5px 10px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", animation: "blink 1.5s ease-in-out infinite" }}></div>
            AI Ready
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", minHeight: isMobile ? "auto" : "calc(100vh - 61px)" }}>
        <div style={{ borderRight: isMobile ? "none" : `1px solid ${theme.panelBorder}`, borderBottom: isMobile ? `1px solid ${theme.panelBorder}` : "none", overflow: "auto", padding: isMobile ? "20px 16px" : "28px 32px" }}>
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ color: theme.text, fontSize: "22px", fontWeight: 600, letterSpacing: "-0.03em", marginBottom: "6px" }}>
              {activeTab === "Build" && "Build your resume"}
              {activeTab === "ATS Score" && "Check ATS match"}
              {activeTab === "Suggestions" && "Get improvements"}
            </h1>
            <p style={{ color: theme.textMuted, fontSize: "13px" }}>
              {activeTab === "Build" && "Fill in your details and let AI craft your resume"}
              {activeTab === "ATS Score" && "Paste a job description to see how well you match"}
              {activeTab === "Suggestions" && "Get specific suggestions to improve your resume"}
            </p>
          </div>

          {activeTab === "Build" && (
            <>
              <ResumeForm formData={formData} setFormData={setFormData} onGenerate={handleGenerate} onClear={handleClearForm} loading={buildLoading} theme={theme} />
              {buildError && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
                  {buildError}
                </div>
              )}
            </>
          )}
          {activeTab === "ATS Score" && (
            <>
              <ATSScorer onScore={handleScore} loading={scoreLoading} result={scoreResult} theme={theme} />
              {scoreError && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
                  {scoreError}
                </div>
              )}
            </>
          )}
          {activeTab === "Suggestions" && (
            <>
              <Suggestions onSuggest={handleSuggest} loading={suggestLoading} result={suggestResult} theme={theme} />
              {suggestResult?.error && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "8px", fontSize: "13px", color: "#dc2626" }}>
                  {suggestResult.error}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ overflow: "auto", padding: isMobile ? "20px 16px" : "28px 32px", background: theme.bgSecondary }}>
          <ResumePreview
            resume={resume}
            onScoreClick={() => setActiveTab("ATS Score")}
            onSaveClick={handleSaveResume}
            onSaveAsNewClick={handleSaveAsNew}
            onClearClick={handleClearResume}
            isLoaded={!!loadedResumeId}
            theme={theme}
            generating={buildLoading}
            onResumeChange={setResume}
          />
        </div>
      </div>

      {showSaved && (
        <div style={{
          position: "fixed",
          top: isMobile ? 0 : "61px",
          right: 0,
          width: isMobile ? "100%" : "320px",
          height: isMobile ? "100vh" : "calc(100vh - 61px)",
          background: theme.bg,
          borderLeft: `1px solid ${theme.panelBorder}`,
          padding: "24px",
          overflowY: "auto",
          zIndex: 50
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: theme.text }}>Saved Resumes</span>
            <button onClick={() => setShowSaved(false)} style={{ background: "none", border: "none", color: theme.textSecondary, cursor: "pointer", fontSize: "20px", padding: 0, lineHeight: 1 }}>×</button>
          </div>
          {savedResumes.length === 0 && (
            <p style={{ fontSize: "13px", color: theme.textMuted }}>No saved resumes yet.</p>
          )}
          {savedResumes.map((r) => (
            <div key={r._id} style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: theme.text, margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: "11px", color: theme.textMuted, margin: "3px 0 0" }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => {
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
                      setShowSaved(false)
                      setActiveTab("Build")
                    }}
                    style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "6px", border: `1px solid ${theme.inputBorder}`, background: "transparent", color: theme.textSecondary, cursor: "pointer", fontFamily: "inherit" }}
                  >Load</button>
                  <button
                    onClick={() => handleDeleteResume(r._id)}
                    style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "6px", border: "1px solid rgba(220,38,38,0.3)", background: "transparent", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                  >Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Footer theme={theme} />

      <button
        onClick={toggleTheme}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: theme.buttonBg,
          color: theme.buttonText,
          border: "none",
          cursor: "pointer",
          boxShadow: themeMode === "dark" ? "0 4px 20px rgba(255,255,255,0.1)" : "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s",
          zIndex: 100
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
      >
        {themeMode === "dark" ? <Sun size={22} strokeWidth={2} /> : <Moon size={22} strokeWidth={2} />}
      </button>
    </div>
  )
}