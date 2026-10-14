// The prompt that writes a resume from the Build form, and the checks applied to what the AI returns.
// Resumes come back shaped for the LaTeX template (see resumeData.js); the other layouts read the same fields.

import { educationLine, linkText } from "./resumeData"

export const EMPTY_FORM = {
  name: "", email: "", phone: "", linkedin: "", github: "", website: "",
  college: "", collegeLocation: "", degree: "", eduDates: "", cgpa: "", coursework: "",
  skills: "", projects: "", experience: "", role: "",
  certifications: "", achievements: "", openSource: ""
}

const range = ([min, max]) => (min ? `${min} to ${max}` : `at most ${max}`)

export function resumePrompt(form, level, { withSummary }) {
  const bullets = level.id === "concise" ? "1 bullet point" : level.id === "detailed" ? "at most 3 bullet points" : "at most 2 bullet points"
  return `Write a one-page resume for a computer science student in India, using only the details below.
Target role: ${form.role}
Skills: ${form.skills}
Projects: ${form.projects}
Experience and internships: ${form.experience}
Certifications: ${form.certifications}
Achievements: ${form.achievements}
Open source contributions: ${form.openSource}

Length: ${level.label}. Each project, experience and contribution: ${bullets}, at most ${level.entry[1]} words in total.${withSummary ? ` Summary: ${range(level.summary)} words.` : ""}
Rules:
- Use only the details given above. Never invent achievements, numbers, tools, skills, employers, dates, places, links, outcomes or impact.
- Every bullet must restate something the details say. When the details are short, write fewer and shorter bullets; one bullet is fine. Never add a bullet just to fill space.
- Leave a field as "" when the details do not give it. Never guess dates, cities, years or links.
- Write numbers as digits exactly as the details give them (6, not six; 30%, not thirty percent).
- Write each description as bullet points separated by \\n. Start each bullet with a past-tense verb; no "I" or "my".
- In each bullet, wrap the key technology or number in **double asterisks**, at most two per bullet.
- No filler or self-praise: avoid words like passionate, dynamic, proven, results-driven, user-centric.
- headline: the target role as a short title, for example "Software Engineer", or "" if none is given.
- skillsList: every skill once. skillCategories: a category for each skill, such as Languages, Databases, Backend, Frontend, Cloud & DevOps, Tools or AI & Data. Use only categories that fit the skills.
- Projects: "name" is the project name, a dash, and a one-line description; "tech" lists the tools used, comma separated, only ones named in the details.
- Achievements: "title" is the event or platform without the year, "desc" is what was won or ranked, "year" only if given.
${withSummary ? "" : "- Do not write a summary.\n"}- Do not mention nationality.

Return ONLY a JSON object with no markdown or backticks:
{"headline":""${withSummary ? ',"summary":""' : ""},"skillsList":[""],"skillCategories":{"skill":"Category"},"experienceList":[{"role":"","company":"","location":"","dates":"","desc":"First bullet\\nSecond bullet"}],"projectsList":[{"name":"","tech":"","link":"","desc":""}],"certifications":[{"name":"","issuer":""}],"achievements":[{"title":"","desc":"","link":"","year":""}],"openSource":[{"name":"","tech":"","link":"","desc":""}]}`
}

const str = (v) => (typeof v === "string" ? v.trim() : "")
const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [])
const descOf = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean).join("\n") : str(v))

// Takes the AI's resume and keeps only what the student's own details support.
// Contact details, links and education come straight from the form; anything the AI adds that
// is not in the student's text (a link, a city, a year) is dropped.
export function cleanGenerated(data, form) {
  const source = Object.values(form).join("\n").toLowerCase()
  const said = (text) => !text || source.includes(text.toLowerCase())
  const yearsSaid = (text) => (text.match(/\d{4}/g) || []).every((y) => source.includes(y))
  const keepLink = (link) => (link && said(linkText(link)) ? link : "")

  const skillsList = [...new Set((Array.isArray(data.skillsList) ? data.skillsList : []).map(str).filter(Boolean))]
  const cats = data.skillCategories && typeof data.skillCategories === "object" ? data.skillCategories : {}
  const skillCategories = Object.fromEntries(skillsList.filter((s) => str(cats[s])).map((s) => [s, str(cats[s])]))

  const educationList = form.college.trim()
    ? [{
        school: form.college.trim(), location: form.collegeLocation.trim(), degree: form.degree.trim(),
        score: form.cgpa.trim(), dates: form.eduDates.trim(), coursework: form.coursework.trim()
      }]
    : []

  return {
    name: form.name.trim() || str(data.name),
    email: form.email.trim(),
    phone: form.phone.trim(),
    headline: str(data.headline),
    links: { linkedin: form.linkedin.trim(), github: form.github.trim(), website: form.website.trim() },
    ...(str(data.summary) ? { summary: str(data.summary) } : {}),
    educationList,
    education: educationLine(educationList),
    skillsList,
    skillCategories,
    experienceList: list(data.experienceList).map((e) => ({
      role: str(e.role), company: str(e.company),
      location: said(str(e.location)) ? str(e.location) : "",
      dates: yearsSaid(str(e.dates)) ? str(e.dates) : "",
      desc: descOf(e.desc)
    })).filter((e) => e.role || e.company || e.desc),
    projectsList: list(data.projectsList).map((p) => ({ name: str(p.name), tech: str(p.tech), link: keepLink(str(p.link)), desc: descOf(p.desc) })).filter((p) => p.name || p.desc),
    // The AI sometimes returns one blank entry for a section the student left empty
    certifications: list(data.certifications).map((c) => ({ name: str(c.name), issuer: str(c.issuer) })).filter((c) => c.name),
    achievements: list(data.achievements).map((a) => ({
      title: str(a.title), desc: str(a.desc), link: keepLink(str(a.link)), year: yearsSaid(str(a.year)) ? str(a.year) : ""
    })).filter((a) => a.title || a.desc),
    openSource: list(data.openSource).map((o) => ({ name: str(o.name), tech: str(o.tech), link: keepLink(str(o.link)), desc: descOf(o.desc) })).filter((o) => o.name)
  }
}
