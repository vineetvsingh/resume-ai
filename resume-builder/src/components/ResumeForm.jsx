export default function ResumeForm({ formData, setFormData, onGenerate, onClear, loading, theme }) {
  const handle = (field) => (e) => setFormData({ ...formData, [field]: e.target.value })

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "inherit",
    background: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: "8px",
    color: theme.inputText,
    marginBottom: "8px",
    outline: "none",
    boxSizing: "border-box"
  }

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "8px",
    marginTop: "16px",
    display: "block"
  }

  return (
    <div>
      <span style={labelStyle}>Personal info</span>
      <input style={inputStyle} placeholder="Full name" onChange={handle('name')} value={formData.name} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Email" onChange={handle('email')} value={formData.email} />
        <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Phone" onChange={handle('phone')} value={formData.phone} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
        <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="College name" onChange={handle('college')} value={formData.college} />
        <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="CGPA / %" onChange={handle('cgpa')} value={formData.cgpa} />
      </div>

      <span style={labelStyle}>Skills</span>
      <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="React, Python, Node.js, MySQL..." onChange={handle('skills')} value={formData.skills} />

      <span style={labelStyle}>Projects</span>
      <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="Describe your projects..." onChange={handle('projects')} value={formData.projects} />

      <span style={labelStyle}>Experience / Internships</span>
      <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="Any internships or work experience..." onChange={handle('experience')} value={formData.experience} />

      <span style={labelStyle}>Target role</span>
      <input style={inputStyle} placeholder="e.g. Software Engineer, Frontend Developer" onChange={handle('role')} value={formData.role} />

      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
      <button
        onClick={onClear}
        disabled={loading}
        style={{
          padding: "12px 20px",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "inherit",
          background: "transparent",
          color: theme.textSecondary,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        Clear
      </button>
      <button
        onClick={onGenerate}
        disabled={loading}
        style={{
          flex: 1,
          padding: "12px",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "inherit",
          background: loading ? theme.inputBg : theme.buttonBg,
          color: loading ? theme.textMuted : theme.buttonText,
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "-0.01em"
        }}
      >
        {loading ? "Generating..." : "Generate Resume →"}
      </button>
</div>
    </div>
  )
}