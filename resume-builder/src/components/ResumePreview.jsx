import { useState } from "react"
import jsPDF from "jspdf"
import { Download } from "lucide-react"

function updateArrayItem(array, index, newItem) {
  return array.map((item, i) => i === index ? newItem : item)
}

function removeArrayItem(array, index) {
  return array.filter((_, i) => i !== index)
}

function addArrayItem(array, newItem) {
  return [...(array || []), newItem]
}

function EditableText({ value, onChange, multiline, block, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  if (editing) {
    const Tag = multiline ? "textarea" : "input"
    return (
      <Tag
        autoFocus
        className="editable-input"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => { onChange(tempValue); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline) { onChange(tempValue); setEditing(false) }
          if (e.key === "Escape") { setTempValue(value); setEditing(false) }
        }}
      />
    )
  }
  const start = () => { setTempValue(value); setEditing(true) }
  return (
    <span
      className="editable"
      role="button"
      tabIndex={0}
      onClick={start}
      onKeyDown={(e) => { if (e.key === "Enter") start() }}
      style={{ display: block ? "block" : "inline" }}
    >
      {value || <span className="editable-empty">{placeholder || "Click to edit"}</span>}
    </span>
  )
}

export default function ResumePreview({ resume, onScoreClick, onSaveClick, onSaveAsNewClick, onClearClick, isLoaded, generating, onResumeChange }) {
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
        <div className="paper" aria-busy="true">
          <p className="paper-status">Writing your resume…</p>
          <div className="skeleton" aria-hidden="true">
            <span className="sk-title"></span>
            <span style={{ width: "55%" }}></span>
            <span className="sk-rule"></span>
            <span></span>
            <span style={{ width: "80%" }}></span>
            <span className="sk-rule"></span>
            <span style={{ width: "40%" }}></span>
            <span className="sk-rule"></span>
            <span style={{ width: "90%" }}></span>
            <span style={{ width: "70%" }}></span>
            <span style={{ width: "85%" }}></span>
          </div>
        </div>
      )
    }
    return (
      <div className="paper-blank">
        <p className="paper-blank-title">No resume yet</p>
        <p>Fill in at least your name and skills, then choose Generate resume. It will appear here, ready to edit.</p>
      </div>
    )
  }

  const set = (patch) => onResumeChange({ ...resume, ...patch })

  return (
    <div>
      <div className="desk-toolbar">
        <p className="desk-hint">Click any line to edit it</p>
        <div className="desk-actions">
          <button onClick={onScoreClick} className="btn btn-ghost btn-sm">Check ATS score</button>
          <button onClick={onSaveClick} className="btn btn-ghost btn-sm">{isLoaded ? "Save changes" : "Save resume"}</button>
          {isLoaded && (
            <button onClick={onSaveAsNewClick} className="btn btn-ghost btn-sm">Save as new</button>
          )}
          <button onClick={onClearClick} className="btn btn-danger btn-sm">Clear</button>
          <button onClick={handleDownload} className="btn btn-primary btn-sm">
            <Download size={14} strokeWidth={2.2} />
            Download PDF
          </button>
        </div>
      </div>

      <article className="paper">
        <h1 className="paper-name">
          <EditableText value={resume.name} onChange={(v) => set({ name: v })} />
        </h1>
        <p className="paper-contact">
          <EditableText value={resume.email} onChange={(v) => set({ email: v })} placeholder="Email" />
          <span className="paper-contact-sep" aria-hidden="true">/</span>
          <EditableText value={resume.phone} onChange={(v) => set({ phone: v })} placeholder="Phone" />
        </p>

        {resume.summary && (
          <>
            <h2 className="paper-h">Summary</h2>
            <p className="paper-muted">
              <EditableText value={resume.summary} multiline block onChange={(v) => set({ summary: v })} />
            </p>
          </>
        )}

        <h2 className="paper-h">Education</h2>
        <p>
          <EditableText value={resume.education} onChange={(v) => set({ education: v })} />
        </p>

        <h2 className="paper-h">Skills</h2>
        <div className="skills">
          {(resume.skillsList || []).map((skill, i) => (
            <span key={i} className="skill">
              <EditableText
                value={skill}
                onChange={(v) => {
                  if (!v.trim()) {
                    set({ skillsList: removeArrayItem(resume.skillsList, i) })
                  } else {
                    set({ skillsList: updateArrayItem(resume.skillsList, i, v) })
                  }
                }}
              />
              <button
                onClick={() => set({ skillsList: removeArrayItem(resume.skillsList, i) })}
                className="remove-x"
                aria-label={`Remove ${skill}`}
                title="Remove skill"
              >×</button>
            </span>
          ))}
          <button onClick={() => set({ skillsList: addArrayItem(resume.skillsList, "New skill") })} className="add-line">
            + Add skill
          </button>
        </div>

        <h2 className="paper-h">Projects</h2>
        <ul className="paper-list">
          {(resume.projectsList || []).map((p, i) => (
            <li key={i}>
              <span className="paper-strong">
                <EditableText
                  value={p.name}
                  onChange={(v) => set({ projectsList: updateArrayItem(resume.projectsList, i, { ...p, name: v }) })}
                />
              </span>
              {": "}
              <EditableText
                value={p.desc}
                multiline
                onChange={(v) => set({ projectsList: updateArrayItem(resume.projectsList, i, { ...p, desc: v }) })}
              />
              <button
                onClick={() => set({ projectsList: removeArrayItem(resume.projectsList, i) })}
                className="remove-x"
                aria-label="Remove project"
                title="Remove project"
              >×</button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => set({ projectsList: addArrayItem(resume.projectsList, { name: "New project", desc: "Description" }) })}
          className="add-line"
        >
          + Add project
        </button>

        <h2 className="paper-h">Experience</h2>
        <ul className="paper-list">
          {(resume.experienceList || []).map((e, i) => (
            <li key={i}>
              <span className="paper-strong">
                <EditableText
                  value={e.role}
                  onChange={(v) => set({ experienceList: updateArrayItem(resume.experienceList, i, { ...e, role: v }) })}
                />
              </span>
              {" at "}
              <EditableText
                value={e.company}
                onChange={(v) => set({ experienceList: updateArrayItem(resume.experienceList, i, { ...e, company: v }) })}
              />
              {": "}
              <EditableText
                value={e.desc}
                multiline
                onChange={(v) => set({ experienceList: updateArrayItem(resume.experienceList, i, { ...e, desc: v }) })}
              />
              <button
                onClick={() => set({ experienceList: removeArrayItem(resume.experienceList, i) })}
                className="remove-x"
                aria-label="Remove experience"
                title="Remove experience"
              >×</button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => set({ experienceList: addArrayItem(resume.experienceList, { role: "New role", company: "Company", desc: "Description" }) })}
          className="add-line"
        >
          + Add experience
        </button>
      </article>
    </div>
  )
}
