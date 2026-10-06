// Shared resume layout settings, read by both the on-screen preview and the PDF export.
// Settings live inside the resume data (resume.settings), so they save with the resume.

export const SECTIONS = [
  { id: "summary", title: "Summary" },
  { id: "education", title: "Education" },
  { id: "skills", title: "Skills" },
  { id: "projects", title: "Projects" },
  { id: "experience", title: "Experience" }
]

export const DEFAULT_SECTION_ORDER = SECTIONS.map((s) => s.id)

export const sectionTitle = (id) => SECTIONS.find((s) => s.id === id)?.title || id

// The saved order, cleaned up: unknown ids dropped, missing sections appended in default order
export function getSectionOrder(resume) {
  const saved = Array.isArray(resume?.settings?.sectionOrder) ? resume.settings.sectionOrder : []
  const known = saved.filter((id, i) => DEFAULT_SECTION_ORDER.includes(id) && saved.indexOf(id) === i)
  return [...known, ...DEFAULT_SECTION_ORDER.filter((id) => !known.includes(id))]
}

export const isDefaultOrder = (order) => order.every((id, i) => id === DEFAULT_SECTION_ORDER[i])

// Whether a section has anything to show (Summary is hidden when empty, as before)
export function sectionHasContent(resume, id) {
  if (id === "summary") return Boolean(resume?.summary)
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
