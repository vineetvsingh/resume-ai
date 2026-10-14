// Helpers for the resume's content fields, shared by the edit view and the PDF layout.
// Fields added for the LaTeX template are optional, so resumes saved before them still work:
//   headline, links { linkedin, github, website }, educationList, skillCategories { skill: category },
//   experience { location, dates }, projects { tech, link }, certifications, achievements, openSource.
// Entry descriptions hold one bullet per line, and **double asterisks** mark text to bold.

// The bullets in a description: one per line, without any leading bullet characters
export const bulletsOf = (desc) =>
  String(desc || "").split("\n").map((l) => l.replace(/^\s*[-•*–]\s+/, "").trim()).filter(Boolean)

// [{ text, bold }] runs from text with **bold** markers
export function richRuns(text) {
  const runs = []
  String(text || "").split(/(\*\*[^*]+\*\*)/).forEach((part) => {
    if (!part) return
    const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4
    runs.push({ text: bold ? part.slice(2, -2) : part, bold })
  })
  return runs
}

// The text without bold markers, for layouts that do not bold inline text
export const plainText = (text) => String(text || "").replace(/\*\*([^*]+)\*\*/g, "$1")

// A description as one plain paragraph, for the layouts that do not use bullets
export const descParagraph = (desc) => bulletsOf(plainText(desc)).join(" ")

// Education entries; older resumes keep education as one "College | CGPA | Year" line
export function educationEntries(resume) {
  if (Array.isArray(resume?.educationList) && resume.educationList.length) return resume.educationList
  const parts = String(resume?.education || "").split("|").map((p) => p.trim())
  if (!parts[0]) return []
  return [{ school: parts[0], location: "", degree: "", score: parts[1] || "", dates: parts.slice(2).join(" | "), coursework: "" }]
}

// The one-line education text older parts of the app (and the AI prompts) read
export const educationLine = (list) =>
  (list[0] ? [list[0].school, list[0].score, list[0].dates].filter(Boolean).join(" | ") : "")

// Skills grouped by category, in the order the skills appear. Skills without a category share one group.
export function skillGroups(resume) {
  const cats = resume?.skillCategories && typeof resume.skillCategories === "object" ? resume.skillCategories : {}
  const groups = []
  ;(resume?.skillsList || []).forEach((skill, index) => {
    const label = String(cats[skill] || "").trim()
    let g = groups.find((x) => x.label === label)
    if (!g) groups.push((g = { label, items: [] }))
    g.items.push({ skill, index })
  })
  // An uncategorised group is called "Skills" alone, or "Other" next to named ones
  const named = groups.some((g) => g.label)
  return groups.map((g) => ({ ...g, title: g.label || (named ? "Other" : "Skills") }))
}

// A clickable URL for something the user typed ("github.com/x", "x@y.com", "https://...")
export function linkUrl(value) {
  const v = String(value || "").trim()
  if (!v) return ""
  if (/^mailto:|^https?:\/\//i.test(v)) return v
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`
  return `https://${v}`
}

// How a link shows on the resume: no scheme, no "www.", no trailing slash
export const linkText = (value) =>
  String(value || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "")

// The header's contact items in template order: phone, email, website, LinkedIn, GitHub
export function contactLinks(resume) {
  const links = resume?.links || {}
  return [
    resume?.phone && { kind: "phone", text: resume.phone },
    resume?.email && { kind: "email", text: resume.email, url: linkUrl(resume.email) },
    links.website && { kind: "website", text: linkText(links.website), url: linkUrl(links.website) },
    links.linkedin && { kind: "linkedin", text: linkText(links.linkedin), url: linkUrl(links.linkedin) },
    links.github && { kind: "github", text: linkText(links.github), url: linkUrl(links.github) }
  ].filter(Boolean)
}
