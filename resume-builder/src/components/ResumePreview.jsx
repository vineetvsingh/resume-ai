import { useState } from "react"
import jsPDF from "jspdf"

export default function ResumePreview({ resume, onScoreClick, onSaveClick, onSaveAsNewClick, onClearClick, isLoaded, theme, generating, onResumeChange }) {
  function updateArrayItem(array, index, newItem) {
  return array.map((item, i) => i === index ? newItem : item)
  }

  function removeArrayItem(array, index) {
    return array.filter((_, i) => i !== index)
  }

  function addArrayItem(array, newItem) {
    return [...(array || []), newItem]
  }

  function EditableText({ value, onChange, multiline, style, placeholder }) {
    const [editing, setEditing] = useState(false)
    const [tempValue, setTempValue] = useState(value)

    if (editing) {
      const Tag = multiline ? "textarea" : "input"
      return (
        <Tag
          autoFocus
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => { onChange(tempValue); setEditing(false) }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !multiline) { onChange(tempValue); setEditing(false) }
            if (e.key === "Escape") { setTempValue(value); setEditing(false) }
          }}
          style={{
            ...style,
            width: "100%",
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.4)",
            borderRadius: "4px",
            padding: "2px 6px",
            outline: "none",
            fontFamily: "inherit",
            resize: multiline ? "vertical" : "none",
            minHeight: multiline ? "60px" : "auto",
            boxSizing: "border-box"
          }}
        />
      )
    }
    return (
      <span
        onClick={() => { setTempValue(value); setEditing(true) }}
        style={{ ...style, cursor: "text", borderRadius: "4px", padding: "2px 4px", margin: "-2px -4px", transition: "background 0.15s" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        {value || <span style={{ color: "#999", fontStyle: "italic" }}>{placeholder || "Click to edit"}</span>}
      </span>
    )
  }

  function handleDownload() {
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = 210
    const pageHeight = 297
    const margin = 20
    const bottomMargin = 20
    const contentWidth = pageWidth - margin * 2
    let y = 20

    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > pageHeight - bottomMargin) {
        pdf.addPage()
        y = 20
      }
    }

    const addSectionHeader = (title) => {
      checkPageBreak(12)
      y += 4
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.setFont("helvetica", "bold")
      pdf.text(title.toUpperCase(), margin, y)
      y += 2
      pdf.setDrawColor(220, 220, 220)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
    }

    pdf.setFontSize(22)
    pdf.setTextColor(17, 17, 17)
    pdf.setFont("helvetica", "bold")
    pdf.text(resume.name || "", margin, y)
    y += 7

    pdf.setFontSize(9)
    pdf.setTextColor(100, 100, 100)
    pdf.setFont("helvetica", "normal")
    const contact = [resume.email, resume.phone].filter(Boolean).join("  ·  ")
    pdf.text(contact, margin, y)
    y += 8

    if (resume.summary) {
      addSectionHeader("Summary")
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      pdf.setFont("helvetica", "normal")
      const summaryLines = pdf.splitTextToSize(resume.summary, contentWidth)
      pdf.text(summaryLines, margin, y)
      y += summaryLines.length * 5 + 2
    }

    addSectionHeader("Education")
    pdf.setFontSize(10)
    pdf.setTextColor(30, 30, 30)
    pdf.setFont("helvetica", "normal")
    pdf.text(resume.education || "", margin, y)
    y += 8

    if (resume.skillsList?.length > 0) {
      addSectionHeader("Skills")
      pdf.setFontSize(10)
      pdf.setTextColor(30, 30, 30)
      pdf.setFont("helvetica", "normal")
      const skillsText = (resume.skillsList || []).join("  ·  ")
      const skillLines = pdf.splitTextToSize(skillsText, contentWidth)
      pdf.text(skillLines, margin, y)
      y += skillLines.length * 5 + 2
    }

    if (resume.projectsList?.length > 0) {
      addSectionHeader("Projects")
      resume.projectsList.forEach((p) => {
        pdf.setFontSize(10)
        pdf.setFont("helvetica", "normal")
        const descLines = pdf.splitTextToSize(p.desc || "", contentWidth - 6)
        checkPageBreak(5 + descLines.length * 5 + 2)
        pdf.setTextColor(17, 17, 17)
        pdf.setFont("helvetica", "bold")
        pdf.text(`• ${p.name || ""}`, margin, y)
        y += 5
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(80, 80, 80)
        pdf.text(descLines, margin + 3, y)
        y += descLines.length * 5 + 2
      })
    }

    if (resume.experienceList?.length > 0) {
      addSectionHeader("Experience")
      resume.experienceList.forEach((e) => {
        pdf.setFontSize(10)
        pdf.setFont("helvetica", "normal")
        const descLines = pdf.splitTextToSize(e.desc || "", contentWidth - 6)
        checkPageBreak(5 + descLines.length * 5 + 2)
        pdf.setTextColor(17, 17, 17)
        pdf.setFont("helvetica", "bold")
        pdf.text(`• ${e.role || ""} at ${e.company || ""}`, margin, y)
        y += 5
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(80, 80, 80)
        pdf.text(descLines, margin + 3, y)
        y += descLines.length * 5 + 2
      })
    }

    pdf.save(`${resume.name || "resume"}.pdf`)
  }

  if (!resume) {
    if (generating) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "16px" }}>          <div style={{ width: "48px", height: "48px", border: `3px solid ${theme.inputBorder}`, borderTopColor: theme.text, borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: theme.text }}>Crafting your resume...</p>
          <p style={{ fontSize: "12px", color: theme.textMuted, marginTop: "-8px" }}>AI is analyzing your details</p>
        </div>
      )
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", height: "100%", gap: "12px" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
        <p style={{ fontSize: "13px", color: theme.textMuted }}>Your resume will appear here</p>
      </div>
    )
  }

  const sectionHeader = {
    fontSize: "10px", fontWeight: 600, color: "#999",
    textTransform: "uppercase", letterSpacing: "0.08em",
    borderBottom: "1px solid #f0f0f0", paddingBottom: "5px",
    marginBottom: "10px", marginTop: "16px"
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: theme.textSecondary }}>Generated Resume</span>
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", flexWrap: "nowrap" }}>
          <button onClick={onScoreClick} className="resume-btn-secondary" style={{ fontSize: "11px", padding: "6px 8px", borderRadius: "6px", border: `1px solid ${theme.secondaryButtonBorder}`, background: "transparent", color: theme.secondaryButtonText, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
            Score this →
          </button>
          <button onClick={onSaveClick} style={{ fontSize: "11px", padding: "6px 8px", borderRadius: "6px", border: `1px solid ${theme.secondaryButtonBorder}`, background: "transparent", color: theme.secondaryButtonText, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
            {isLoaded ? "Update" : "Save Resume"}
          </button>
          {isLoaded && (
            <button onClick={onSaveAsNewClick} style={{ fontSize: "11px", padding: "6px 8px", borderRadius: "6px", border: `1px solid ${theme.secondaryButtonBorder}`, background: "transparent", color: theme.secondaryButtonText, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
              Save as New
            </button>
          )}
          <button onClick={handleDownload} style={{ fontSize: "11px", padding: "6px 10px", borderRadius: "6px", border: "none", background: theme.buttonBg, color: theme.buttonText, cursor: "pointer", fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
            Download PDF
          </button>
          <button onClick={onClearClick} style={{ fontSize: "11px", padding: "6px 8px", borderRadius: "6px", border: "1px solid rgba(220,38,38,0.3)", background: "transparent", color: "#dc2626", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
            Clear
          </button>
        </div>
      </div>

      <div className="resume-fade-in" style={{ background: theme.resumeCardBg, borderRadius: "12px", padding: "32px", fontSize: "13px", lineHeight: "1.7", color: theme.resumeText }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: theme.resumeText, marginBottom: "4px", letterSpacing: "-0.02em" }}>
          <EditableText value={resume.name} onChange={(v) => onResumeChange({ ...resume, name: v })} style={{ display: "inline-block" }} />
        </h1>
        <p style={{ color: theme.resumeMuted, fontSize: "12px", marginBottom: "4px" }}>
          <EditableText value={resume.email} onChange={(v) => onResumeChange({ ...resume, email: v })} style={{ display: "inline-block" }} />
          {resume.phone ? " · " : ""}
          <EditableText value={resume.phone} onChange={(v) => onResumeChange({ ...resume, phone: v })} style={{ display: "inline-block" }} placeholder="Phone" />
        </p>

        {resume.summary && (
          <>
            <p style={sectionHeader}>Summary</p>
            <p style={{ color: theme.resumeTextSecondary, marginBottom: "4px", fontSize: "13px" }}>
              <EditableText value={resume.summary} multiline onChange={(v) => onResumeChange({ ...resume, summary: v })} style={{ display: "block" }} />
            </p>
          </>
        )}

        <p style={sectionHeader}>Education</p>
        <p style={{ color: theme.resumeText, marginBottom: "4px" }}>
          <EditableText value={resume.education} onChange={(v) => onResumeChange({ ...resume, education: v })} style={{ display: "inline-block" }} />
        </p>

        <p style={sectionHeader}>Skills</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "4px", alignItems: "center" }}>
          {(resume.skillsList || []).map((skill, i) => (
            <span key={i} style={{ background: theme.skillChipBg, color: theme.skillChipText, fontSize: "12px", padding: "3px 10px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <EditableText
                value={skill}
                onChange={(v) => {
                  if (!v.trim()) {
                    onResumeChange({ ...resume, skillsList: removeArrayItem(resume.skillsList, i) })
                  } else {
                    onResumeChange({ ...resume, skillsList: updateArrayItem(resume.skillsList, i, v) })
                  }
                }}
                style={{ display: "inline-block" }}
              />
              <button
                onClick={() => onResumeChange({ ...resume, skillsList: removeArrayItem(resume.skillsList, i) })}
                style={{ background: "none", border: "none", color: theme.skillChipText, cursor: "pointer", fontSize: "14px", padding: 0, lineHeight: 1, opacity: 0.5 }}
                title="Remove skill"
              >×</button>
            </span>
          ))}
          <button
            onClick={() => onResumeChange({ ...resume, skillsList: addArrayItem(resume.skillsList, "New skill") })}
            style={{ background: "transparent", border: `1px dashed ${theme.resumeMuted}`, color: theme.resumeMuted, fontSize: "12px", padding: "3px 10px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}
          >
            + Add skill
          </button>
        </div>

        <p style={sectionHeader}>Projects</p>
        <ul style={{ listStyle: "disc", paddingLeft: "18px", color: theme.resumeTextSecondary, marginBottom: "4px" }}>
          {(resume.projectsList || []).map((p, i) => (
            <li key={i} style={{ marginBottom: "6px", position: "relative" }}>
              <span style={{ fontWeight: 600, color: theme.resumeText }}>
                <EditableText
                  value={p.name}
                  onChange={(v) => onResumeChange({ ...resume, projectsList: updateArrayItem(resume.projectsList, i, { ...p, name: v }) })}
                  style={{ display: "inline-block" }}
                />
              </span> — <EditableText
                value={p.desc}
                multiline
                onChange={(v) => onResumeChange({ ...resume, projectsList: updateArrayItem(resume.projectsList, i, { ...p, desc: v }) })}
                style={{ display: "inline-block" }}
              />
              <button
                onClick={() => onResumeChange({ ...resume, projectsList: removeArrayItem(resume.projectsList, i) })}
                style={{ background: "none", border: "none", color: theme.resumeMuted, cursor: "pointer", fontSize: "14px", padding: "0 0 0 8px", lineHeight: 1, opacity: 0.4 }}
                title="Remove project"
              >×</button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => onResumeChange({ ...resume, projectsList: addArrayItem(resume.projectsList, { name: "New project", desc: "Description" }) })}
          style={{ background: "transparent", border: `1px dashed ${theme.resumeMuted}`, color: theme.resumeMuted, fontSize: "12px", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", marginBottom: "12px", fontFamily: "inherit" }}
        >
          + Add project
        </button>

        <p style={sectionHeader}>Experience</p>
        <ul style={{ listStyle: "disc", paddingLeft: "18px", color: theme.resumeTextSecondary }}>
          {(resume.experienceList || []).map((e, i) => (
            <li key={i} style={{ marginBottom: "6px" }}>
              <span style={{ fontWeight: 600, color: theme.resumeText }}>
                <EditableText
                  value={e.role}
                  onChange={(v) => onResumeChange({ ...resume, experienceList: updateArrayItem(resume.experienceList, i, { ...e, role: v }) })}
                  style={{ display: "inline-block" }}
                />
              </span> at <EditableText
                value={e.company}
                onChange={(v) => onResumeChange({ ...resume, experienceList: updateArrayItem(resume.experienceList, i, { ...e, company: v }) })}
                style={{ display: "inline-block" }}
              /> — <EditableText
                value={e.desc}
                multiline
                onChange={(v) => onResumeChange({ ...resume, experienceList: updateArrayItem(resume.experienceList, i, { ...e, desc: v }) })}
                style={{ display: "inline-block" }}
              />
              <button
                onClick={() => onResumeChange({ ...resume, experienceList: removeArrayItem(resume.experienceList, i) })}
                style={{ background: "none", border: "none", color: theme.resumeMuted, cursor: "pointer", fontSize: "14px", padding: "0 0 0 8px", lineHeight: 1, opacity: 0.4 }}
                title="Remove experience"
              >×</button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => onResumeChange({ ...resume, experienceList: addArrayItem(resume.experienceList, { role: "New role", company: "Company", desc: "Description" }) })}
          style={{ background: "transparent", border: `1px dashed ${theme.resumeMuted}`, color: theme.resumeMuted, fontSize: "12px", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit" }}
        >
          + Add experience
        </button>
      </div>
    </div>
  )
}