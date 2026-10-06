import jsPDF from "jspdf"
import { getSectionOrder } from "./resumeLayout"
import { getStyle, variantOf, fontFile, SECTION_SPACINGS } from "./resumeStyle"

// One layout, two renderers: the PDF and the on-screen page view draw the same positioned items,
// so they match exactly (fonts, sizes, line breaks, page breaks). Units are millimetres.

const PT = 25.4 / 72
export const PAGE = { width: 210, height: 297, margin: 20, borderInset: 9 }
const COLORS = { ink: "#1b1f27", body: "#3d4450", muted: "#5a6270", line: "#1b1f27" }

// ---------- Fonts ----------

const fontData = new Map() // font file -> Promise<base64>

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function loadFont(file) {
  if (!fontData.has(file)) {
    fontData.set(file, fetch(file).then((r) => {
      if (!r.ok) throw new Error(`Font ${file} could not be loaded`)
      return r.arrayBuffer()
    }).then(toBase64).catch((e) => {
      fontData.delete(file)
      throw e
    }))
  }
  return fontData.get(file)
}

// The font and variant used for each kind of text
function fontFor(style, role) {
  if (role === "body" || role === "contact") return { id: style.bodyFont, variant: "normal" }
  return { id: style.headingFont, variant: variantOf(style.text[role]) }
}

function fontsNeeded(style) {
  const all = ["name", "heading", "subheading", "body"].map((role) => fontFor(style, role))
  return all.filter((f, i) => all.findIndex((g) => g.id === f.id && g.variant === f.variant) === i)
}

// A jsPDF document with the style's fonts registered, ready for measuring and drawing
export async function createPdf(style) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" })
  for (const f of fontsNeeded(style)) {
    const file = fontFile(f.id, f.variant)
    const name = file.split("/").pop()
    pdf.addFileToVFS(name, await loadFont(file))
    pdf.addFont(name, f.id, f.variant)
  }
  return pdf
}

// ---------- Layout ----------

// Returns { pages: [[item]] }. Items are
//   { t: "text", x, y (baseline), text, font, variant, size (pt), color }
//   { t: "line", x1, y1, x2, y2, width (pt), dash: "solid" | "dashed" | "dotted" }
//   { t: "rect", x, y, w, h, width (pt), dash }
export function layoutResume(resume, style, pdf) {
  const { margin, width: pageW, height: pageH } = PAGE
  const bottom = pageH - margin
  const gapBefore = SECTION_SPACINGS.find((s) => s.id === style.sectionSpacing).mm
  const pages = [[]]
  let y = margin
  const page = () => pages[pages.length - 1]
  const newPage = () => { pages.push([]); y = margin }

  const lineHeight = (size) => size * PT * style.lineSpacing
  const ascent = (size) => size * PT * 0.8
  const fits = (h) => y + h <= bottom

  const wrap = (text, role, size, width) => {
    const f = fontFor(style, role)
    pdf.setFont(f.id, f.variant)
    pdf.setFontSize(size)
    const shown = style.text[role]?.upper ? text.toUpperCase() : text
    return pdf.splitTextToSize(shown, width)
  }
  const pushLine = (text, role, size, color, x) => {
    const f = fontFor(style, role)
    page().push({ t: "text", x, y: y + ascent(size), text, font: f.id, variant: f.variant, size, color })
    y += lineHeight(size)
  }
  const paragraph = (text, role, size, color, x = margin) => {
    if (!String(text || "").trim()) return
    for (const line of wrap(String(text), role, size, pageW - margin - x)) {
      if (!fits(lineHeight(size))) newPage()
      pushLine(line, role, size, color, x)
    }
  }
  const divider = (headingSize) => {
    if (!style.divider.show) { y += 1.4; return }
    const w = style.divider.width
    const lineY = y - lineHeight(headingSize) + ascent(headingSize) + headingSize * PT * 0.3 + 0.6
    const dash = style.divider.style === "double" ? "solid" : style.divider.style
    page().push({ t: "line", x1: margin, y1: lineY, x2: pageW - margin, y2: lineY, width: w, dash })
    let end = lineY
    if (style.divider.style === "double") {
      end = lineY + w * PT + 0.7
      page().push({ t: "line", x1: margin, y1: end, x2: pageW - margin, y2: end, width: w, dash: "solid" })
    }
    y = Math.max(y, end) + 2.6
  }

  const { sizes } = style

  // Header: name and contact line stay at the top
  paragraph(resume.name || "", "name", sizes.name, COLORS.ink)
  y += 0.4
  paragraph([resume.email, resume.phone].filter(Boolean).join("  /  "), "contact", sizes.body, COLORS.muted)

  const entries = {
    projects: (resume.projectsList || []).map((p) => ({ title: p?.name || "", desc: p?.desc || "" })),
    experience: (resume.experienceList || []).map((e) => ({ title: [e?.role, e?.company].filter(Boolean).join(" at "), desc: e?.desc || "" }))
  }
  const titles = { summary: "Summary", education: "Education", skills: "Skills", projects: "Projects", experience: "Experience" }
  const hasContent = {
    summary: Boolean(resume.summary),
    education: Boolean(resume.education),
    skills: (resume.skillsList || []).length > 0,
    projects: entries.projects.length > 0,
    experience: entries.experience.length > 0
  }

  for (const id of getSectionOrder(resume)) {
    if (!hasContent[id]) continue
    // Keep a heading with at least two lines of what follows it
    const need = gapBefore + lineHeight(sizes.heading) + 4 + lineHeight(sizes.body) * 2
    if (!fits(need)) newPage()
    else if (y > margin) y += gapBefore

    paragraph(titles[id], "heading", sizes.heading, COLORS.ink)
    divider(sizes.heading)

    if (id === "summary") paragraph(resume.summary, "body", sizes.body, COLORS.body)
    if (id === "education") paragraph(resume.education, "body", sizes.body, COLORS.body)
    if (id === "skills") paragraph(resume.skillsList.join("  ·  "), "body", sizes.body, COLORS.body)
    if (id === "projects" || id === "experience") {
      entries[id].forEach((entry, i) => {
        const descLines = wrap(entry.desc, "body", sizes.body, pageW - 2 * margin).length
        if (!fits(lineHeight(sizes.subheading) + lineHeight(sizes.body) * Math.min(2, descLines))) newPage()
        paragraph(entry.title, "subheading", sizes.subheading, COLORS.ink)
        paragraph(entry.desc, "body", sizes.body, COLORS.body)
        if (i < entries[id].length - 1) y += 1.6
      })
    }
  }

  // Page border on every page
  if (style.border.type !== "none") {
    const inset = PAGE.borderInset
    const w = style.border.width
    for (const items of pages) {
      items.unshift({ t: "rect", x: inset, y: inset, w: pageW - 2 * inset, h: pageH - 2 * inset, width: w, dash: style.border.style })
      if (style.border.type === "double") {
        const gap = w * PT + 1
        items.unshift({ t: "rect", x: inset + gap, y: inset + gap, w: pageW - 2 * (inset + gap), h: pageH - 2 * (inset + gap), width: w, dash: style.border.style })
      }
    }
  }

  return { pages }
}

// Dash patterns shared by the PDF and the page view (millimetres)
export function dashPattern(dash, widthPt) {
  const w = widthPt * PT
  if (dash === "dashed") return [Math.max(2, w * 5), Math.max(1.4, w * 3)]
  if (dash === "dotted") return [0.001, Math.max(0.9, w * 2.6)]
  return []
}

// ---------- Rendering ----------

function drawLayout(pdf, layout) {
  layout.pages.forEach((items, i) => {
    if (i > 0) pdf.addPage()
    for (const item of items) {
      if (item.t === "text") {
        pdf.setFont(item.font, item.variant)
        pdf.setFontSize(item.size)
        pdf.setTextColor(item.color)
        pdf.text(item.text, item.x, item.y)
        continue
      }
      pdf.setDrawColor(COLORS.line)
      pdf.setLineWidth(item.width * PT)
      pdf.setLineCap(item.dash === "dotted" ? "round" : "butt")
      pdf.setLineDashPattern(dashPattern(item.dash, item.width), 0)
      if (item.t === "line") pdf.line(item.x1, item.y1, item.x2, item.y2)
      if (item.t === "rect") pdf.rect(item.x, item.y, item.w, item.h, "S")
      pdf.setLineDashPattern([], 0)
      pdf.setLineCap("butt")
    }
  })
}

// Lays the resume out with its saved style. Used by the page view, the page count and the download.
export async function layoutWithStyle(resume) {
  const style = getStyle(resume)
  const pdf = await createPdf(style)
  return { pdf, style, layout: layoutResume(resume, style, pdf) }
}

export async function buildResumePdf(resume) {
  const { pdf, layout } = await layoutWithStyle(resume)
  drawLayout(pdf, layout)
  return pdf
}
