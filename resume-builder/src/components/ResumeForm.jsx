function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <span className="field-hint"> ({hint})</span>}
      </span>
      {children}
    </label>
  )
}

export default function ResumeForm({ formData, setFormData, onGenerate, onClear, loading }) {
  const handle = (field) => (e) => setFormData({ ...formData, [field]: e.target.value })

  return (
    <div>
      <div className="form-section">
        <h2 className="form-section-title">About you</h2>
        <Field label="Full name" hint="required">
          <input className="input" placeholder="Aarav Sharma" onChange={handle('name')} value={formData.name} />
        </Field>
        <div className="field-row">
          <Field label="Email">
            <input className="input" type="email" placeholder="aarav@example.com" onChange={handle('email')} value={formData.email} />
          </Field>
          <Field label="Phone">
            <input className="input" type="tel" placeholder="+91 98765 43210" onChange={handle('phone')} value={formData.phone} />
          </Field>
        </div>
        <div className="field-row">
          <Field label="College">
            <input className="input" placeholder="College name" onChange={handle('college')} value={formData.college} />
          </Field>
          <Field label="CGPA or percentage">
            <input className="input" placeholder="8.4" onChange={handle('cgpa')} value={formData.cgpa} />
          </Field>
        </div>
      </div>

      <div className="form-section">
        <h2 className="form-section-title">Your work</h2>
        <Field label="Skills" hint="required">
          <textarea className="input" placeholder="React, Python, Node.js, MySQL" onChange={handle('skills')} value={formData.skills} />
        </Field>
        <Field label="Projects">
          <textarea className="input" placeholder="What you built, the stack, and what it achieved" onChange={handle('projects')} value={formData.projects} />
        </Field>
        <Field label="Experience and internships">
          <textarea className="input" placeholder="Role, company, and what you did there" onChange={handle('experience')} value={formData.experience} />
        </Field>
        <Field label="Target role">
          <input className="input" placeholder="Software Engineer, Frontend Developer" onChange={handle('role')} value={formData.role} />
        </Field>
      </div>

      <div className="form-actions">
        <button onClick={onClear} disabled={loading} className="btn btn-ghost">
          Clear form
        </button>
        <button onClick={onGenerate} disabled={loading} className="btn btn-primary">
          {loading ? "Generating…" : "Generate resume"}
        </button>
      </div>
    </div>
  )
}
