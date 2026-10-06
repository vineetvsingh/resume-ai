import jsPDF from "jspdf"
import { getSectionOrder } from "./resumeLayout"
import { getStyle, variantOf, fontFile, SECTION_SPACINGS, accentOf, getSkillLevels } from "./resumeStyle"

// One layout, two renderers: the PDF and the on-screen page view draw the same positioned items,
// so they match exactly (fonts, sizes, line breaks, page breaks). Units are millimetres.

const PT = 25.4 / 72
export const PAGE = { width: 210, height: 297, margin: 20, borderInset: 9 }
const COLORS = { ink: "#1b1f27", body: "#3d4450", muted: "#5a6270", line: "#1b1f27", track: "#d5d9e0" }
// Creative mode: a tinted sidebar on the left of every page
const SIDEBAR = { width: 66, pad: 9, top: 16 }

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
//   { t: "line", x1, y1, x2, y2, width (pt), dash: "solid" | "dashed" | "dotted", color }
//   { t: "rect", x, y, w, h, width (pt), dash, color, fill, rx }   (fill only: width 0)
export function layoutResume(resume, style, pdf) {
  const { margin, width: pageW, height: pageH } = PAGE
  const mode = style.mode
  const accent = accentOf(style)
  const strong = mode === "formal" ? COLORS.ink : accent.hex
  const gapBefore = SECTION_SPACINGS.find((s) => s.id === style.sectionSpacing).mm
  const pages = [[]]
  const { sizes } = style

  const lineHeight = (size) => size * PT * style.lineSpacing
  const ascent = (size) => size * PT * 0.8

  // Creative mode gives every page a sidebar background
  const decorate = (items) => {
    if (mode === "creative") items.push({ t: "rect", x: 0, y: 0, w: SIDEBAR.width, h: pageH, width: 0, fill: accent.tint })
  }
  decorate(pages[0])

  // A column of content that fills pages from top to bottom and continues on the next page
  function flow(x, width, top, bottom) {
    const f = { x, width, top, bottom, page: 0, y: top }
    f.items = () => pages[f.page]
    f.fits = (h) => f.y + h <= bottom
    f.newPage = () => {
      f.page += 1
      if (!pages[f.page]) { pages.push([]); decorate(pages[f.page]) }
      f.y = top
    }
    return f
  }

  const setFont = (role, size) => {
    const ft = fontFor(style, role)
    pdf.setFont(ft.id, ft.variant)
    pdf.setFontSize(size)
    return ft
  }
  const shown = (text, role) => (style.text[role]?.upper ? text.toUpperCase() : text)
  const wrap = (text, role, size, width) => { setFont(role, size); return pdf.splitTextToSize(shown(text, role), width) }
  const textWidth = (text, role, size) => { setFont(role, size); return pdf.getTextWidth(text) }

  const pushText = (f, text, role, size, color, x) => {
    const ft = fontFor(style, role)
    f.items().push({ t: "text", x, y: f.y + ascent(size), text, font: ft.id, variant: ft.variant, size, color })
  }
  const paragraph = (f, text, role, size, color, indent = 0) => {
    if (!String(text || "").trim()) return
    for (const line of wrap(String(text), role, size, f.width - indent)) {
      if (!f.fits(lineHeight(size))) f.newPage()
      pushText(f, line, role, size, color, f.x + indent)
      f.y += lineHeight(size)
    }
  }
  const divider = (f, headingSize) => {
    if (!style.divider.show) { f.y += 1.4; return }
    const w = style.divider.width
    const lineY = f.y - lineHeight(headingSize) + ascent(headingSize) + headingSize * PT * 0.3 + 0.6
    const dash = style.divider.style === "double" ? "solid" : style.divider.style
    const color = mode === "formal" ? COLORS.line : accent.hex
    f.items().push({ t: "line", x1: f.x, y1: lineY, x2: f.x + f.width, y2: lineY, width: w, dash, color })
    let end = lineY
    if (style.divider.style === "double") {
      end = lineY + w * PT + 0.7
      f.items().push({ t: "line", x1: f.x, y1: end, x2: f.x + f.width, y2: end, width: w, dash: "solid", color })
    }
    f.y = Math.max(f.y, end) + 2.6
  }

  // Contact icons for Modern and Creative, drawn as simple shapes (no images, so the PDF stays text-based)
  const ICON = 3.4
  const icon = (f, kind, x, baseline) => {
    const lw = 0.6
    const top = baseline - 2.6
    if (kind === "email") {
      f.items().push({ t: "rect", x, y: top, w: ICON, h: 2.5, width: lw, dash: "solid", color: accent.hex, rx: 0.3 })
      f.items().push({ t: "line", x1: x + 0.15, y1: top + 0.2, x2: x + ICON / 2, y2: top + 1.45, width: lw, dash: "solid", color: accent.hex })
      f.items().push({ t: "line", x1: x + ICON / 2, y1: top + 1.45, x2: x + ICON - 0.15, y2: top + 0.2, width: lw, dash: "solid", color: accent.hex })
    } else {
      f.items().push({ t: "rect", x: x + 0.7, y: top - 0.5, w: 2, h: 3.3, width: lw, dash: "solid", color: accent.hex, rx: 0.45 })
      f.items().push({ t: "line", x1: x + 1.4, y1: top + 2.25, x2: x + 2, y2: top + 2.25, width: lw, dash: "solid", color: accent.hex })
    }
  }
  const contactItems = [["email", resume.email], ["phone", resume.phone]].filter(([, v]) => v)

  // A row of contact details with icons; wraps to the next line when it runs out of room
  const contactRow = (f) => {
    const size = sizes.body
    let x = f.x
    for (const [kind, value] of contactItems) {
      const w = ICON + 1.5 + textWidth(value, "contact", size)
      if (x > f.x && x + w > f.x + f.width) { f.y += lineHeight(size); x = f.x }
      icon(f, kind, x, f.y + ascent(size))
      pushText(f, value, "contact", size, COLORS.muted, x + ICON + 1.5)
      x += w + 5
    }
    f.y += lineHeight(size)
  }

  // Skill tags (Modern): tinted rounded boxes that wrap like words
  const skillTags = (f, skills) => {
    const size = sizes.body * 0.92
    const h = size * PT * 1.55
    const padX = 1.6
    const gap = 1.6
    let x = f.x
    if (!f.fits(h)) f.newPage()
    for (const skill of skills) {
      const w = textWidth(skill, "body", size) + padX * 2
      if (x > f.x && x + w > f.x + f.width) {
        x = f.x
        f.y += h + gap
        if (!f.fits(h)) f.newPage()
      }
      f.items().push({ t: "rect", x, y: f.y, w, h, width: 0, fill: accent.tint, rx: 0.9 })
      const ft = fontFor(style, "body")
      f.items().push({ t: "text", x: x + padX, y: f.y + h / 2 + size * PT * 0.33, text: skill, font: ft.id, variant: ft.variant, size, color: COLORS.ink })
      x += w + gap
    }
    f.y += h
  }

  // Skill bars (Creative): each skill on its own line, with a bar if the user set a level
  const levels = getSkillLevels(resume)
  const skillBars = (f, skills) => {
    for (const skill of skills) {
      const level = levels[skill]
      const need = lineHeight(sizes.body) + (level ? 2.6 : 0)
      if (!f.fits(need)) f.newPage()
      pushText(f, skill, "body", sizes.body, COLORS.body, f.x)
      f.y += lineHeight(sizes.body)
      if (level) {
        f.items().push({ t: "rect", x: f.x, y: f.y - 0.6, w: f.width, h: 1.3, width: 0, fill: COLORS.track, rx: 0.65 })
        f.items().push({ t: "rect", x: f.x, y: f.y - 0.6, w: (f.width * level) / 5, h: 1.3, width: 0, fill: accent.hex, rx: 0.65 })
        f.y += 2.6
      }
    }
  }

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

  const section = (f, id) => {
    // Keep a heading with at least two lines of what follows it
    const need = gapBefore + lineHeight(sizes.heading) + 4 + lineHeight(sizes.body) * 2
    if (!f.fits(need)) f.newPage()
    else if (f.y > f.top) f.y += gapBefore

    paragraph(f, titles[id], "heading", sizes.heading, strong)
    divider(f, sizes.heading)

    if (id === "summary") paragraph(f, resume.summary, "body", sizes.body, COLORS.body)
    if (id === "education") paragraph(f, resume.education, "body", sizes.body, COLORS.body)
    if (id === "skills") {
      if (mode === "modern") skillTags(f, resume.skillsList)
      else if (mode === "creative") skillBars(f, resume.skillsList)
      else paragraph(f, resume.skillsList.join("  ·  "), "body", sizes.body, COLORS.body)
    }
    if (id === "projects" || id === "experience") {
      entries[id].forEach((entry, i) => {
        const descLines = wrap(entry.desc, "body", sizes.body, f.width).length
        if (!f.fits(lineHeight(sizes.subheading) + lineHeight(sizes.body) * Math.min(2, descLines))) f.newPage()
        paragraph(f, entry.title, "subheading", sizes.subheading, COLORS.ink)
        paragraph(f, entry.desc, "body", sizes.body, COLORS.body)
        if (i < entries[id].length - 1) f.y += 1.6
      })
    }
  }

  const order = getSectionOrder(resume).filter((id) => hasContent[id])

  if (mode === "creative") {
    // Sidebar: name, contact, then Skills and Education in their saved order. Main column: the rest.
    const side = flow(SIDEBAR.pad, SIDEBAR.width - SIDEBAR.pad * 2, SIDEBAR.top, pageH - SIDEBAR.top)
    const mainX = SIDEBAR.width + 10
    const main = flow(mainX, pageW - mainX - 14, SIDEBAR.top, pageH - SIDEBAR.top)
    paragraph(side, resume.name || "", "name", sizes.name * 0.85, accent.hex)
    side.y += 2
    for (const [kind, value] of contactItems) {
      wrap(value, "contact", sizes.body * 0.92, side.width - ICON - 1.5).forEach((line, i) => {
        if (i === 0) icon(side, kind, side.x, side.y + ascent(sizes.body * 0.92))
        pushText(side, line, "contact", sizes.body * 0.92, COLORS.muted, side.x + ICON + 1.5)
        side.y += lineHeight(sizes.body * 0.92)
      })
    }
    for (const id of order) section(["skills", "education"].includes(id) ? side : main, id)
  } else {
    const f = flow(margin, pageW - 2 * margin, margin, pageH - margin)
    paragraph(f, resume.name || "", "name", sizes.name, strong)
    f.y += 0.4
    if (mode === "modern") contactRow(f)
    else paragraph(f, contactItems.map(([, v]) => v).join("  /  "), "contact", sizes.body, COLORS.muted)
    for (const id of order) section(f, id)
  }

  // Page border on every page
  if (style.border.type !== "none") {
    const inset = PAGE.borderInset
    const w = style.border.width
    for (const items of pages) {
      items.push({ t: "rect", x: inset, y: inset, w: pageW - 2 * inset, h: pageH - 2 * inset, width: w, dash: style.border.style, color: COLORS.line })
      if (style.border.type === "double") {
        const gap = w * PT + 1
        items.push({ t: "rect", x: inset + gap, y: inset + gap, w: pageW - 2 * (inset + gap), h: pageH - 2 * (inset + gap), width: w, dash: style.border.style, color: COLORS.line })
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
      if (item.t === "rect" && item.fill) {
        pdf.setFillColor(item.fill)
        if (item.rx) pdf.roundedRect(item.x, item.y, item.w, item.h, item.rx, item.rx, "F")
        else pdf.rect(item.x, item.y, item.w, item.h, "F")
        continue
      }
      pdf.setDrawColor(item.color || COLORS.line)
      pdf.setLineWidth(item.width * PT)
      pdf.setLineCap(item.dash === "dotted" ? "round" : "butt")
      pdf.setLineDashPattern(dashPattern(item.dash, item.width), 0)
      if (item.t === "line") pdf.line(item.x1, item.y1, item.x2, item.y2)
      if (item.t === "rect") {
        if (item.rx) pdf.roundedRect(item.x, item.y, item.w, item.h, item.rx, item.rx, "S")
        else pdf.rect(item.x, item.y, item.w, item.h, "S")
      }
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
