import { useState } from "react"
import { api } from "../auth"

const SECTIONS = [
  {
    title: "About you",
    fields: [
      { key: "name", label: "Full name", autoComplete: "name", required: true, maxLength: 80 },
      { key: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "+91 98765 43210", maxLength: 30 },
      { key: "location", label: "City", autoComplete: "address-level2", placeholder: "Prayagraj", maxLength: 80 }
    ]
  },
  {
    title: "Education",
    fields: [
      { key: "college", label: "College", placeholder: "College name", maxLength: 120 },
      { key: "cgpa", label: "CGPA or percentage", placeholder: "8.4", maxLength: 20 },
      { key: "graduationYear", label: "Graduation year", inputMode: "numeric", placeholder: "2026", maxLength: 4, pattern: "\\d{4}" }
    ]
  },
  {
    title: "Career",
    fields: [
      { key: "targetRole", label: "Target role", placeholder: "Software Engineer", maxLength: 80 }
    ]
  },
  {
    title: "Links",
    fields: [
      { key: "linkedin", label: "LinkedIn", inputMode: "url", autoCapitalize: "none", placeholder: "linkedin.com/in/yourname", maxLength: 200 },
      { key: "github", label: "GitHub", inputMode: "url", autoCapitalize: "none", placeholder: "github.com/yourname", maxLength: 200 },
      { key: "portfolio", label: "Portfolio or website", inputMode: "url", autoCapitalize: "none", placeholder: "yourname.dev", maxLength: 200 }
    ]
  }
]

export default function ProfileSettings({ user, onSaved, onBack }) {
  const [profile, setProfile] = useState(user.profile)
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  const dirty = SECTIONS.some((s) => s.fields.some((f) => (profile[f.key] || "") !== (user.profile[f.key] || "")))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      const data = await api("/profile", { method: "PUT", body: profile })
      onSaved(data.user)
      setProfile(data.user.profile)
      setStatus({ type: "success", text: "Profile saved" })
    } catch (err) {
      setStatus({ type: "error", text: err.status ? err.message : "Could not reach the server. Check that the backend is running." })
    }
    setSaving(false)
  }

  return (
    <main className="dash profile">
      <h1 className="page-title">Profile settings</h1>
      <p className="page-lede">
        These details fill in the form each time you start a new resume. Only you can see them.
      </p>

      <form onSubmit={handleSubmit} className="profile-form">
        <section className="form-section">
          <h2 className="form-section-title">Account</h2>
          <label className="field">
            <span className="field-label">Email <span className="field-hint">(used to log in)</span></span>
            <input className="input" value={user.email} readOnly disabled />
          </label>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.title} className="form-section">
            <h2 className="form-section-title">{section.title}</h2>
            <div className="profile-grid">
              {section.fields.map(({ key, label, ...inputProps }) => (
                <label key={key} className="field">
                  <span className="field-label">{label}</span>
                  <input
                    className="input"
                    type="text"
                    {...inputProps}
                    value={profile[key] || ""}
                    onChange={(e) => { setProfile({ ...profile, [key]: e.target.value }); setStatus(null) }}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        {status && (
          <div className={status.type === "success" ? "alert alert-ok" : "alert"} role="status">{status.text}</div>
        )}

        <div className="form-actions profile-actions">
          <button type="button" onClick={onBack} className="btn btn-ghost">Back to dashboard</button>
          <button type="submit" disabled={saving || !dirty} className="btn btn-primary">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </main>
  )
}
