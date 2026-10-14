import { useState, useEffect, useRef } from "react"
import { Download, Palette, PencilLine, FileText, Mail, Phone } from "lucide-react"
import { SortableList, SortableItem, ReorderTools } from "./Sortable"
import { buildResumePdf, layoutWithStyle } from "../pdf"
import PageView from "./PageView"
import DesignPanel from "./DesignPanel"
import { EditableText, Description } from "./Editable"
import { templateSections } from "./TemplateSections"
import { getStyle, normalizeStyle, PRESETS, cssFamily, SECTION_SPACINGS, accentOf, getSkillLevels, styleForMode, hasSmallCaps } from "../resumeStyle"
import LengthPicker from "./LengthPicker"
import { getSectionOrder, isDefaultOrder, sectionTitle, sectionHasContent, withSettings, moveItem, defaultOrderFor, lengthLevel } from "../resumeLayout"

function updateArrayItem(array, index, newItem) {
  return array.map((item, i) => i === index ? newItem : item)
}

function removeArrayItem(array, index) {
  return array.filter((_, i) => i !== index)
}

function addArrayItem(array, newItem) {
  return [...(array || []), newItem]
}

// Five dots to set a skill's level for Creative mode's skill bars; pressing the current level clears it
function LevelDots({ skill, level, onChange }) {
  return (
    <span className="level-dots" role="group" aria-label={`${skill} level`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`level-dot${level >= n ? " is-on" : ""}`}
          aria-label={`${skill} level ${n} of 5`}
          aria-pressed={level === n}
          onClick={() => onChange(level === n ? 0 : n)}
        />
      ))}
    </span>
  )
}

// CSS variables that make the editable view follow the design settings
function styleVars(style) {
  const t = (role) => style.text[role]
  const dividerWidth = style.divider.style === "double" ? Math.max(style.divider.width * 3, 2.25) : style.divider.width
  const borderWidth = style.border.type === "double" ? Math.max(style.border.width * 3, 2.25) : style.border.width
  const accent = style.mode === "formal" || style.mode === "latex" ? "#1b1f27" : accentOf(style).hex
  return {
    "--r-accent": accent,
    "--r-tint": accentOf(style).tint,
    "--r-head-font": `"${cssFamily(style.headingFont)}"`,
    "--r-body-font": `"${cssFamily(style.bodyFont)}"`,
    "--r-name-size": `${style.sizes.name}pt`,
    "--r-head-size": `${style.sizes.heading}pt`,
    "--r-sub-size": `${style.sizes.subheading}pt`,
    "--r-body-size": `${style.sizes.body}pt`,
    "--r-name-weight": t("name").bold ? 700 : 400,
    "--r-name-style": t("name").italic ? "italic" : "normal",
    "--r-name-case": t("name").upper ? "uppercase" : "none",
    "--r-head-weight": t("heading").bold ? 700 : 400,
    "--r-head-style": t("heading").italic ? "italic" : "normal",
    "--r-head-case": t("heading").upper ? "uppercase" : "none",
    "--r-sub-weight": t("subheading").bold ? 700 : 400,
    "--r-sub-style": t("subheading").italic ? "italic" : "normal",
    "--r-sub-case": t("subheading").upper ? "uppercase" : "none",
    "--r-line": style.lineSpacing,
    "--r-gap": `${SECTION_SPACINGS.find((x) => x.id === style.sectionSpacing).mm}mm`,
    "--r-divider": style.divider.show ? `${dividerWidth}pt ${style.divider.style} ${accent}` : "0 none transparent",
    "--r-border": style.border.type === "none" ? "0 none transparent" : `${borderWidth}pt ${style.border.type === "double" ? "double" : style.border.style} #1b1f27`
  }
}

export default function ResumePreview({ resume, onScoreClick, onSaveClick, onSaveAsNewClick, onClearClick, isLoaded, generating, onResumeChange, saveNote, undo, length, onLengthChange, lengthBusy, onApplyStyleToAll, canApplyAll }) {
  const [view, setView] = useState("edit")
  const [designOpen, setDesignOpen] = useState(false)
  const [layout, setLayout] = useState(null)
  const [pageNote, setPageNote] = useState(null)
  const [applying, setApplying] = useState(false)
  const lastPages = useRef(0)
  const designOpenRef = useRef(false)
  const openDesign = (open) => {
    designOpenRef.current = open
    setDesignOpen(open)
    // On narrow screens the panel is a bottom sheet, so bring the resume into the space above it
    if (open && window.innerWidth <= 1024) {
      requestAnimationFrame(() => {
        const target = document.querySelector(".page-view:not([hidden]), .styled-paper:not([hidden])")
        const header = document.querySelector(".header")?.offsetHeight || 0
        if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header - 8, behavior: "smooth" })
      })
    }
  }

  // Lay the resume out with the same engine as the PDF, for the page view and the page count
  useEffect(() => {
    if (!resume) return
    let cancelled = false
    const timer = setTimeout(() => {
      layoutWithStyle(resume)
        .then(({ layout }) => {
          if (cancelled) return
          setLayout(layout)
          // While designing, warn when a change pushes the resume onto another page
          const pages = layout.pages.length
          if (designOpenRef.current && lastPages.current && pages > lastPages.current) {
            setPageNote(`That change pushed your resume onto ${pages === 2 ? "a second page" : `${pages} pages`}.`)
          } else if (pages <= 1) {
            setPageNote(null)
          }
          lastPages.current = pages
        })
        .catch(() => { if (!cancelled) setLayout(null) })
    }, 120)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [resume])

  const pageCount = layout?.pages.length || 0

  const level = lengthLevel(length)
  const overflow = pageCount > level.pages
  const style = getStyle(resume)

  async function handleDownload() {
    const pdf = await buildResumePdf(resume)
    pdf.save(`${resume.name || "resume"}.pdf`)
  }

  // Entering or leaving LaTeX mode swaps in that mode's own look; the other modes share styles as before
  const setStyle = (next) => {
    const switching = next.mode !== style.mode && (next.mode === "latex" || style.mode === "latex")
    const nextStyle = normalizeStyle(switching ? styleForMode(next.mode, next.accent) : next)
    const patch = { style: nextStyle }
    // A resume still in the old mode's default section order takes the new mode's default order
    if (switching && isDefaultOrder(getSectionOrder(resume, style.mode), style.mode)) patch.sectionOrder = defaultOrderFor(next.mode)
    onResumeChange(withSettings(resume, patch))
  }
  async function applyToAll() {
    setApplying(true)
    await onApplyStyleToAll(style)
    setApplying(false)
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
  const skillLevels = getSkillLevels(resume)

  const mode = style.mode
  const latex = mode === "latex"
  const order = getSectionOrder(resume, mode)
  const visibleSections = order.filter((id) => sectionHasContent(resume, id, mode))
  // Moving among visible sections; hidden ones (an empty Summary) keep their saved place
  const moveSection = (from, to) => {
    const moved = moveItem(visibleSections, from, to)
    let k = 0
    const next = order.map((id) => (visibleSections.includes(id) ? moved[k++] : id))
    onResumeChange(withSettings(resume, { sectionOrder: next }))
  }
  const resetOrder = () => onResumeChange(withSettings(resume, { sectionOrder: defaultOrderFor(mode) }))

  // Entries within a section can be reordered the same way. `list` and `setList` override where the
  // entries are read from and saved to (education keeps a one-line copy for older parts of the app).
  const entryList = ({ key, label, entryName, renderEntry, empty: emptyEntry, list = resume[key] || [], setList = (next) => set({ [key]: next }) }) => {
    const ids = list.map((_, i) => `${key}-${i}`)
    const move = (from, to) => setList(moveItem(list, from, to))
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
                      onClick={() => setList(removeArrayItem(list, i))}
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
        <button onClick={() => setList(addArrayItem(list, emptyEntry))} className="add-line">
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
    skills: () => style.mode === "creative" ? (
      <ul className="skill-levels">
        {(resume.skillsList || []).map((skill, i) => (
          <li key={i}>
            <EditableText
              value={skill}
              onChange={(v) => set({ skillsList: v.trim() ? updateArrayItem(resume.skillsList, i, v) : removeArrayItem(resume.skillsList, i) })}
            />
            <LevelDots
              skill={skill}
              level={skillLevels[skill] || 0}
              onChange={(n) => {
                const next = { ...skillLevels }
                if (n) next[skill] = n
                else delete next[skill]
                onResumeChange(withSettings(resume, { skillLevels: next }))
              }}
            />
          </li>
        ))}
        <li>
          <button onClick={() => set({ skillsList: addArrayItem(resume.skillsList, "New skill") })} className="add-line">+ Add skill</button>
        </li>
      </ul>
    ) : (
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
    projects: () => entryList({
      key: "projectsList",
      label: "project",
      entryName: (p) => p?.name,
      renderEntry: (p, i) => (
        <>
          <span className="paper-strong entry-title">
            <EditableText
              value={p.name}
              onChange={(v) => set({ projectsList: updateArrayItem(resume.projectsList, i, { ...p, name: v }) })}
            />
          </span>
          <span className="entry-desc">
            <Description
              value={p.desc}
              onChange={(v) => set({ projectsList: updateArrayItem(resume.projectsList, i, { ...p, desc: v }) })}
            />
          </span>
        </>
      ),
      empty: { name: "New project", desc: "Description" }
    }),
    experience: () => entryList({
      key: "experienceList",
      label: "experience",
      entryName: (e) => [e?.role, e?.company].filter(Boolean).join(" at "),
      renderEntry: (e, i) => (
        <>
          <span className="paper-strong entry-title">
            <EditableText
              value={e.role}
              onChange={(v) => set({ experienceList: updateArrayItem(resume.experienceList, i, { ...e, role: v }) })}
            />
            {" at "}
            <EditableText
              value={e.company}
              onChange={(v) => set({ experienceList: updateArrayItem(resume.experienceList, i, { ...e, company: v }) })}
            />
          </span>
          <span className="entry-desc">
            <Description
              value={e.desc}
              onChange={(v) => set({ experienceList: updateArrayItem(resume.experienceList, i, { ...e, desc: v }) })}
            />
          </span>
        </>
      ),
      empty: { role: "New role", company: "Company", desc: "Description" }
    }),
    // LaTeX mode replaces these with the template's editors; education and the optional sections come from there in every mode
    ...templateSections({ resume, set, entryList, latex })
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
        <div className="view-switch" role="radiogroup" aria-label="Preview">
          <button type="button" role="radio" aria-checked={view === "edit"} className={`seg-btn${view === "edit" ? " is-on" : ""}`} onClick={() => setView("edit")}>
            <PencilLine size={14} /> Edit
          </button>
          <button type="button" role="radio" aria-checked={view === "pages"} className={`seg-btn${view === "pages" ? " is-on" : ""}`} onClick={() => setView("pages")}>
            <FileText size={14} /> Pages
          </button>
        </div>
        <button type="button" onClick={() => openDesign(true)} className="btn btn-ghost btn-sm" aria-expanded={designOpen}>
          <Palette size={14} /> Design
        </button>
        <span className="length-bar-label">Length</span>
        <LengthPicker value={length} onChange={onLengthChange} disabled={lengthBusy} compact name="length-preview" />
        <span className={`page-count${overflow ? " is-over" : ""}`} role="status">
          {lengthBusy ? "Rewriting…" : pageCount ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}` : ""}
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
          {saveNote || (view === "edit"
            ? "Click any line to edit it. Drag a section's handle to move it."
            : "Exactly what the PDF will look like. Switch to Edit to change the text.")}
          {!saveNote && !isDefaultOrder(order, mode) && (
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

      {view === "pages" && <PageView layout={layout} />}

      {designOpen && (
        <DesignPanel
          style={style}
          onChange={setStyle}
          onPreset={(id) => setStyle({ ...PRESETS.find((p) => p.id === id).style, mode: style.mode, accent: style.accent })}
          onReset={() => setStyle(styleForMode(style.mode === "latex" ? "latex" : "formal", style.accent))}
          onApplyAll={applyToAll}
          canApplyAll={canApplyAll}
          applying={applying}
          pageNote={pageNote}
          onClose={() => openDesign(false)}
        />
      )}

      {style.mode === "creative" && (
        <p className="mode-banner" role="note">
          Creative mode: ATS software can misread its two columns, so use Formal for online applications.
          {view === "edit" && " The two-column layout shows in Pages."}
        </p>
      )}

      <article className="paper styled-paper" data-mode={style.mode} data-caps={hasSmallCaps(style.headingFont)} style={styleVars(style)} hidden={view !== "edit"}>
        <h1 className="paper-name">
          <EditableText value={resume.name} onChange={(v) => set({ name: v })} />
        </h1>
        {latex ? (
          <>
            <p className="tpl-headline">
              <EditableText value={resume.headline} onChange={(v) => set({ headline: v })} placeholder="Headline, e.g. Software Engineer" />
            </p>
            <p className="paper-contact tpl-contact">
              {[
                ["phone", "Phone", resume.phone, (v) => set({ phone: v })],
                ["email", "Email", resume.email, (v) => set({ email: v })],
                ["website", "Website", resume.links?.website, (v) => set({ links: { ...resume.links, website: v } })],
                ["linkedin", "LinkedIn link", resume.links?.linkedin, (v) => set({ links: { ...resume.links, linkedin: v } })],
                ["github", "GitHub link", resume.links?.github, (v) => set({ links: { ...resume.links, github: v } })]
              ].map(([key, label, value, onChange], i) => (
                <span key={key} className={`tpl-contact-item${value ? "" : " is-empty"}`}>
                  {i > 0 && <span className="paper-contact-sep" aria-hidden="true">|</span>}
                  <EditableText value={value} onChange={onChange} placeholder={label} />
                </span>
              ))}
            </p>
          </>
        ) : (
          <p className="paper-contact">
            {style.mode !== "formal" && <Mail size={13} className="contact-icon" aria-hidden="true" />}
            <EditableText value={resume.email} onChange={(v) => set({ email: v })} placeholder="Email" />
            {style.mode === "formal" ? <span className="paper-contact-sep" aria-hidden="true">/</span> : <Phone size={13} className="contact-icon" aria-hidden="true" />}
            <EditableText value={resume.phone} onChange={(v) => set({ phone: v })} placeholder="Phone" />
          </p>
        )}

        <SortableList
          ids={visibleSections}
          onMove={moveSection}
          getName={(id) => sectionTitle(id, mode)}
          renderOverlay={(id) => sectionTitle(id, mode)}
        >
          {(id, index, drop) => (
            <SortableItem key={id} id={id} as="section" className="paper-section" drop={drop}>
              {({ handle }) => (
                <>
                  <h2 className="paper-h">
                    <span>{sectionTitle(id, mode)}</span>
                    <ReorderTools
                      handle={handle}
                      name={`the ${sectionTitle(id, mode)} section`}
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
