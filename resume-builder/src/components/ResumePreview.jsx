import { useState, useMemo } from "react"
import { Download } from "lucide-react"
import { SortableList, SortableItem, ReorderTools } from "./Sortable"
import { buildResumePdf } from "../pdf"
import LengthPicker from "./LengthPicker"
import { getSectionOrder, isDefaultOrder, sectionTitle, sectionHasContent, withSettings, moveItem, DEFAULT_SECTION_ORDER, lengthLevel } from "../resumeLayout"

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

export default function ResumePreview({ resume, onScoreClick, onSaveClick, onSaveAsNewClick, onClearClick, isLoaded, generating, onResumeChange, saveNote, undo, length, onLengthChange, lengthBusy }) {
  // Page count from the real PDF layout, so the warning matches what will be downloaded
  const pageCount = useMemo(() => (resume ? buildResumePdf(resume).getNumberOfPages() : 0), [resume])
  const level = lengthLevel(length)
  const overflow = pageCount > level.pages

  function handleDownload() {
    buildResumePdf(resume).save(`${resume.name || "resume"}.pdf`)
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

  const order = getSectionOrder(resume)
  const visibleSections = order.filter((id) => sectionHasContent(resume, id))
  // Moving among visible sections; hidden ones (an empty Summary) keep their saved place
  const moveSection = (from, to) => {
    const moved = moveItem(visibleSections, from, to)
    let k = 0
    const next = order.map((id) => (visibleSections.includes(id) ? moved[k++] : id))
    onResumeChange(withSettings(resume, { sectionOrder: next }))
  }
  const resetOrder = () => onResumeChange(withSettings(resume, { sectionOrder: DEFAULT_SECTION_ORDER }))

  // Projects and experience entries can be reordered the same way
  const entryList = (key, label, entryName, renderEntry, emptyEntry) => {
    const list = resume[key] || []
    const ids = list.map((_, i) => `${key}-${i}`)
    const move = (from, to) => set({ [key]: moveItem(list, from, to) })
    return (
      <>
        <ul className="paper-list">
          <SortableList
            ids={ids}
            onMove={move}
            getName={(id) => entryName(list[ids.indexOf(id)]) || label}
            renderOverlay={(id) => entryName(list[ids.indexOf(id)]) || label}
          >
            {(id, i, drop) => (
              <SortableItem key={id} id={id} as="li" className="paper-entry" drop={drop}>
                {({ handle }) => (
                  <>
                    {renderEntry(list[i], i)}
                    <button
                      onClick={() => set({ [key]: removeArrayItem(list, i) })}
                      className="remove-x"
                      aria-label={`Remove ${entryName(list[i]) || label}`}
                      title={`Remove ${label}`}
                    >×</button>
                    {list.length > 1 && (
                      <ReorderTools
                        handle={handle}
                        name={entryName(list[i]) || label}
                        index={i}
                        count={list.length}
                        onMove={move}
                        size={13}
                      />
                    )}
                  </>
                )}
              </SortableItem>
            )}
          </SortableList>
        </ul>
        <button onClick={() => set({ [key]: addArrayItem(list, emptyEntry) })} className="add-line">
          + Add {label}
        </button>
      </>
    )
  }

  const renderSection = {
    summary: () => (
      <p className="paper-muted">
        <EditableText value={resume.summary} multiline block onChange={(v) => set({ summary: v })} />
      </p>
    ),
    education: () => (
      <p>
        <EditableText value={resume.education} onChange={(v) => set({ education: v })} />
      </p>
    ),
    skills: () => (
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
    ),
    projects: () => entryList(
      "projectsList",
      "project",
      (p) => p?.name,
      (p, i) => (
        <>
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
        </>
      ),
      { name: "New project", desc: "Description" }
    ),
    experience: () => entryList(
      "experienceList",
      "experience",
      (e) => [e?.role, e?.company].filter(Boolean).join(" at "),
      (e, i) => (
        <>
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
        </>
      ),
      { role: "New role", company: "Company", desc: "Description" }
    )
  }

  return (
    <div>
      {undo && (
        <div className="undo-bar" role="status">
          <span>{undo.label}.</span>
          <button onClick={undo.onUndo} className="link-btn">Undo</button>
        </div>
      )}
      <div className="length-bar">
        <span className="length-bar-label">Length</span>
        <LengthPicker value={length} onChange={onLengthChange} disabled={lengthBusy} compact name="length-preview" />
        <span className={`page-count${overflow ? " is-over" : ""}`} role="status">
          {lengthBusy ? "Rewriting…" : `${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
        </span>
      </div>
      {overflow && !lengthBusy && (
        <div className="page-warning" role="alert">
          {level.label} resumes should fit on {level.pages === 1 ? "one page" : `${level.pages} pages`}; this one runs to {pageCount}.
          {level.id !== "concise" ? " Try a shorter length or remove a few lines." : " Remove a few lines to bring it back to one page."}
        </div>
      )}
      <div className="desk-toolbar">
        <p className="desk-hint" role="status">
          {saveNote || "Click any line to edit it. Drag a section's handle to move it."}
          {!saveNote && !isDefaultOrder(order) && (
            <button onClick={resetOrder} className="link-btn reset-order">Reset order</button>
          )}
        </p>
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

        <SortableList
          ids={visibleSections}
          onMove={moveSection}
          getName={sectionTitle}
          renderOverlay={(id) => sectionTitle(id)}
        >
          {(id, index, drop) => (
            <SortableItem key={id} id={id} as="section" className="paper-section" drop={drop}>
              {({ handle }) => (
                <>
                  <h2 className="paper-h">
                    <span>{sectionTitle(id)}</span>
                    <ReorderTools
                      handle={handle}
                      name={`the ${sectionTitle(id)} section`}
                      index={index}
                      count={visibleSections.length}
                      onMove={moveSection}
                    />
                  </h2>
                  {renderSection[id]()}
                </>
              )}
            </SortableItem>
          )}
        </SortableList>
      </article>
    </div>
  )
}
