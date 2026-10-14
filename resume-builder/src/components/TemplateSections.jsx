import { EditableText, Description } from "./Editable"
import { educationEntries, educationLine, skillGroups } from "../resumeData"

const update = (list, i, patch) => list.map((item, j) => (j === i ? { ...item, ...patch } : item))

// A line with a left part and a right-aligned part, like the template's title rows
const row = (left, right, className = "") => (
  <div className={`tpl-row ${className}`}>
    <span className="tpl-left">{left}</span>
    {right && <span className="tpl-right">{right}</span>}
  </div>
)

// Edit-view sections for the LaTeX template's fields. `entryList` is the preview's sortable list builder.
// In the other design modes (`latex` false) only education and the optional sections come from here.
export function templateSections({ resume, set, entryList, latex }) {
  // An editable field of entry i in a list
  const field = (list, setList, i, key, placeholder) => (
    <EditableText value={list[i][key]} placeholder={placeholder} onChange={(v) => setList(update(list, i, { [key]: v }))} />
  )

  const projectLike = (key, label, linkLabel, empty) => {
    const list = resume[key] || []
    const setList = (next) => set({ [key]: next })
    const f = (i, k, placeholder) => field(list, setList, i, k, placeholder)
    return entryList({
      key, label, list, setList, empty,
      entryName: (p) => p?.name,
      renderEntry: (p, i) => (
        <>
          {row(
            <>
              <strong>{f(i, "name", "Name - One-line description")}</strong>
              <span className="tpl-sep">|</span>
              <em>{f(i, "tech", "Tech, Stack")}</em>
            </>,
            <span className="tpl-link">{f(i, "link", `${linkLabel} link`)}</span>,
            "tpl-sub"
          )}
          <Description value={p.desc} asBullets={latex} onChange={(v) => setList(update(list, i, { desc: v }))} />
        </>
      )
    })
  }

  const sections = {
    education: () => {
      const list = educationEntries(resume)
      // Older parts of the app read the first school as one line, so keep that copy in step
      const setList = (next) => set({ educationList: next, education: educationLine(next) })
      const f = (i, k, placeholder) => field(list, setList, i, k, placeholder)
      return entryList({
        key: "educationList", label: "education", list, setList,
        empty: { school: "University name", location: "", degree: "", score: "", dates: "", coursework: "" },
        entryName: (e) => e?.school,
        renderEntry: (e, i) => (
          <>
            {row(<strong>{f(i, "school", "University name")}</strong>, latex && f(i, "location", "City, Country"), "tpl-sub")}
            {row(
              <em>{f(i, "degree", "Degree and major")}<span className="tpl-sep">—</span><strong>{f(i, "score", "CGPA")}</strong></em>,
              <em>{f(i, "dates", "Mon YYYY – Mon YYYY")}</em>,
              "tpl-small"
            )}
            {latex && (
              <ul className="tpl-bullets">
                <li>Relevant Coursework: {f(i, "coursework", "Course 1, Course 2, Course 3")}</li>
              </ul>
            )}
          </>
        )
      })
    },

    openSource: () => projectLike("openSource", "contribution", "PR", { name: "org/repo: What the PR did", tech: "", link: "", desc: "" }),

    certifications: () => {
      const list = resume.certifications || []
      const setList = (next) => set({ certifications: next })
      const f = (i, k, placeholder) => field(list, setList, i, k, placeholder)
      return entryList({
        key: "certifications", label: "certification", list, setList,
        empty: { name: "Certification name", issuer: "" },
        entryName: (c) => c?.name,
        renderEntry: (c, i) => row(<strong>{f(i, "name", "Certification name")}</strong>, <em>{f(i, "issuer", "Issuing organisation")}</em>)
      })
    },

    achievements: () => {
      const list = resume.achievements || []
      const setList = (next) => set({ achievements: next })
      const f = (i, k, placeholder) => field(list, setList, i, k, placeholder)
      return entryList({
        key: "achievements", label: "achievement", list, setList,
        empty: { title: "Event or platform", desc: "", link: "", year: "" },
        entryName: (a) => a?.title,
        renderEntry: (a, i) => (
          <>
            {row(<><strong>{f(i, "title", "Event or platform")}:</strong> {f(i, "desc", "What you won or ranked")}</>, f(i, "year", "Year"))}
            <span className="tpl-meta">Proof link: {f(i, "link", "optional")}</span>
          </>
        )
      })
    }
  }
  if (!latex) return sections

  return {
    ...sections,

    skills: () => {
      const skills = resume.skillsList || []
      const cats = resume.skillCategories || {}
      const setSkills = (nextSkills, nextCats = cats) => {
        // Categories of removed skills go too
        const kept = Object.fromEntries(Object.entries(nextCats).filter(([s]) => nextSkills.includes(s)))
        set({ skillsList: nextSkills, skillCategories: kept })
      }
      const removeSkill = (index) => setSkills(skills.filter((_, j) => j !== index))
      const renameSkill = (index, value) => {
        if (!value.trim()) return removeSkill(index)
        const old = skills[index]
        const nextCats = { ...cats }
        if (old in nextCats) { nextCats[value] = nextCats[old]; delete nextCats[old] }
        setSkills(skills.map((s, j) => (j === index ? value : s)), nextCats)
      }
      const renameGroup = (group, label) => {
        const nextCats = { ...cats }
        group.items.forEach(({ skill }) => { if (label.trim()) nextCats[skill] = label.trim(); else delete nextCats[skill] })
        setSkills(skills, nextCats)
      }
      const addSkill = (label) => {
        const name = `New skill ${skills.length + 1}`
        setSkills([...skills, name], label ? { ...cats, [name]: label } : cats)
      }
      return (
        <div className="tpl-skills">
          {skillGroups(resume).map((g) => (
            <div key={g.label || "_"} className="tpl-skill-line">
              <strong><EditableText value={g.label} placeholder={g.title} onChange={(v) => renameGroup(g, v)} /></strong>:{" "}
              {g.items.map(({ skill, index }, k) => (
                <span key={index} className="tpl-skill">
                  <EditableText value={skill} onChange={(v) => renameSkill(index, v)} />
                  <button onClick={() => removeSkill(index)} className="remove-x" aria-label={`Remove ${skill}`} title="Remove skill">×</button>
                  {k < g.items.length - 1 && ", "}
                </span>
              ))}
              <button onClick={() => addSkill(g.label)} className="add-line tpl-inline-add">+ skill</button>
            </div>
          ))}
          <button onClick={() => addSkill("New category")} className="add-line">+ Add category</button>
        </div>
      )
    },

    experience: () => {
      const list = resume.experienceList || []
      const setList = (next) => set({ experienceList: next })
      const f = (i, k, placeholder) => field(list, setList, i, k, placeholder)
      return entryList({
        key: "experienceList", label: "experience", list, setList,
        empty: { role: "Job title", company: "Company", location: "", dates: "", desc: "" },
        entryName: (e) => [e?.role, e?.company].filter(Boolean).join(" at "),
        renderEntry: (e, i) => (
          <>
            {row(<strong>{f(i, "role", "Job title")}</strong>, f(i, "dates", "Mon YYYY – Present"), "tpl-sub")}
            {row(<em>{f(i, "company", "Company")}</em>, <em>{f(i, "location", "City or Remote")}</em>, "tpl-small")}
            <Description value={e.desc} asBullets onChange={(v) => setList(update(list, i, { desc: v }))} />
          </>
        )
      })
    },

    projects: () => projectLike("projectsList", "project", "Project", { name: "Project name - One-line description", tech: "", link: "", desc: "" })
  }
}
