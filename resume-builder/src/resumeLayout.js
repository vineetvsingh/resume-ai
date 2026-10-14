// Shared resume layout settings, read by both the on-screen preview and the PDF export.
// Settings live inside the resume data (resume.settings), so they save with the resume.

// `latex` is the heading the LaTeX template uses; `optional` sections only show once they have entries
export const SECTIONS = [
  { id: "summary", title: "Summary" },
  { id: "education", title: "Education" },
  { id: "skills", title: "Skills", latex: "Technical Skills" },
  { id: "projects", title: "Projects" },
  { id: "experience", title: "Experience" },
  { id: "certifications", title: "Certifications", optional: true },
  { id: "achievements", title: "Achievements", optional: true },
  { id: "openSource", title: "Open Source Contributions", optional: true }
]

export const DEFAULT_SECTION_ORDER = SECTIONS.map((s) => s.id)
// The order in resume_template.tex
export const LATEX_SECTION_ORDER = ["summary", "education", "skills", "certifications", "achievements", "experience", "openSource", "projects"]
export const defaultOrderFor = (mode) => (mode === "latex" ? LATEX_SECTION_ORDER : DEFAULT_SECTION_ORDER)

export const sectionTitle = (id, mode) => {
  const s = SECTIONS.find((x) => x.id === id)
  return (mode === "latex" && s?.latex) || s?.title || id
}

// The list each optional section keeps its entries in
export const SECTION_LISTS = { certifications: "certifications", achievements: "achievements", openSource: "openSource" }

// The saved order, cleaned up: unknown ids dropped, missing sections appended in the mode's default order
export function getSectionOrder(resume, mode) {
  const fallback = defaultOrderFor(mode)
  const saved = Array.isArray(resume?.settings?.sectionOrder) ? resume.settings.sectionOrder : []
  const known = saved.filter((id, i) => fallback.includes(id) && saved.indexOf(id) === i)
  return [...known, ...fallback.filter((id) => !known.includes(id))]
}

export const isDefaultOrder = (order, mode) => order.every((id, i) => id === defaultOrderFor(mode)[i])

// Whether the edit view shows a section. Summary is hidden when empty, as before. The optional sections
// show in LaTeX mode (so entries can be added) and otherwise only once they have entries.
export function sectionHasContent(resume, id, mode) {
  if (id === "summary") return Boolean(resume?.summary)
  if (SECTION_LISTS[id]) return mode === "latex" || (resume?.[SECTION_LISTS[id]] || []).length > 0
  return true
}

export function withSettings(resume, patch) {
  return { ...resume, settings: { ...(resume.settings || {}), ...patch } }
}

// The resume without layout settings, for sending to the AI
export function contentOnly(resume) {
  if (!resume) return resume
  // eslint-disable-next-line no-unused-vars
  const { settings, ...content } = resume
  return content
}

export function moveItem(list, from, to) {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// Content length levels (FR-2). Word limits are maximums; the AI never pads to reach a minimum.
export const LENGTHS = [
  { id: "concise", label: "Concise", summary: [0, 30], entry: [0, 20], pages: 1, hint: "Up to 30-word summary, key result only" },
  { id: "balanced", label: "Balanced", summary: [30, 50], entry: [20, 40], pages: 1, hint: "30–50 word summary, 20–40 per entry" },
  { id: "detailed", label: "Detailed", summary: [50, 80], entry: [40, 70], pages: 2, hint: "Tools and results spelled out, up to 2 pages" }
]
export const DEFAULT_LENGTH = "balanced"
export const lengthLevel = (id) => LENGTHS.find((l) => l.id === id) || LENGTHS.find((l) => l.id === DEFAULT_LENGTH)
export const getLength = (resume) => lengthLevel(resume?.settings?.length).id
