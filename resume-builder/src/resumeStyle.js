// Resume style settings (FR-4). Saved in resume.settings.style; read by the edit view, the page view and the PDF.

export const FONTS = [
  { id: "source-serif-4", name: "Source Serif 4", kind: "Serif" },
  { id: "merriweather", name: "Merriweather", kind: "Serif" },
  { id: "lora", name: "Lora", kind: "Serif" },
  { id: "eb-garamond", name: "EB Garamond", kind: "Serif" },
  { id: "inter", name: "Inter", kind: "Sans" },
  { id: "lato", name: "Lato", kind: "Sans" },
  { id: "source-sans-3", name: "Source Sans 3", kind: "Sans" },
  { id: "roboto", name: "Roboto", kind: "Sans" }
]

// The browser font-family name for a font id (prefixed so it never clashes with the app's own fonts)
export const cssFamily = (id) => `ra-${id}`

export const SIZE_RANGES = {
  name: [18, 28],
  heading: [11, 16],
  subheading: [10, 13],
  body: [9, 12]
}
export const LINE_SPACING_RANGE = [1, 1.5]
export const DIVIDER_WIDTH_RANGE = [0.5, 2]
export const BORDER_WIDTH_RANGE = [0.5, 3]
export const DIVIDER_STYLES = ["solid", "dashed", "dotted", "double"]
export const BORDER_TYPES = ["none", "single", "double"]
export const BORDER_STYLES = ["solid", "dashed"]
export const SECTION_SPACINGS = [
  { id: "compact", label: "Compact", mm: 3 },
  { id: "normal", label: "Normal", mm: 5.5 },
  { id: "relaxed", label: "Relaxed", mm: 8.5 }
]

// Classic matches how resumes looked before style settings existed
export const DEFAULT_STYLE = {
  headingFont: "source-serif-4",
  bodyFont: "source-serif-4",
  sizes: { name: 24, heading: 12, subheading: 11, body: 10.5 },
  text: {
    name: { bold: true, italic: false, upper: false },
    heading: { bold: true, italic: false, upper: false },
    subheading: { bold: true, italic: false, upper: false }
  },
  divider: { show: true, style: "solid", width: 0.75 },
  border: { type: "none", style: "solid", width: 1 },
  lineSpacing: 1.3,
  sectionSpacing: "normal"
}

export const PRESETS = [
  { id: "classic", label: "Classic", style: DEFAULT_STYLE },
  {
    id: "modern",
    label: "Modern",
    style: {
      ...DEFAULT_STYLE,
      headingFont: "inter",
      bodyFont: "inter",
      sizes: { name: 26, heading: 11, subheading: 10.5, body: 10 },
      text: {
        name: { bold: true, italic: false, upper: false },
        heading: { bold: true, italic: false, upper: true },
        subheading: { bold: true, italic: false, upper: false }
      },
      divider: { show: true, style: "solid", width: 0.5 },
      lineSpacing: 1.35
    }
  },
  {
    id: "compact",
    label: "Compact",
    style: {
      ...DEFAULT_STYLE,
      headingFont: "source-sans-3",
      bodyFont: "source-sans-3",
      sizes: { name: 20, heading: 11, subheading: 10, body: 9.5 },
      divider: { show: true, style: "solid", width: 0.5 },
      lineSpacing: 1.15,
      sectionSpacing: "compact"
    }
  }
]

const clamp = (v, [lo, hi], fallback) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback)
const pick = (v, options, fallback) => (options.includes(v) ? v : fallback)
const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback)
const textStyle = (v, d) => ({ bold: bool(v?.bold, d.bold), italic: bool(v?.italic, d.italic), upper: bool(v?.upper, d.upper) })

// A complete, valid style from whatever is saved (missing or out-of-range values fall back to the default)
export function normalizeStyle(saved) {
  const s = saved && typeof saved === "object" ? saved : {}
  const d = DEFAULT_STYLE
  const fontIds = FONTS.map((f) => f.id)
  return {
    headingFont: pick(s.headingFont, fontIds, d.headingFont),
    bodyFont: pick(s.bodyFont, fontIds, d.bodyFont),
    sizes: Object.fromEntries(Object.keys(SIZE_RANGES).map((k) => [k, clamp(s.sizes?.[k], SIZE_RANGES[k], d.sizes[k])])),
    text: {
      name: textStyle(s.text?.name, d.text.name),
      heading: textStyle(s.text?.heading, d.text.heading),
      subheading: textStyle(s.text?.subheading, d.text.subheading)
    },
    divider: {
      show: bool(s.divider?.show, d.divider.show),
      style: pick(s.divider?.style, DIVIDER_STYLES, d.divider.style),
      width: clamp(s.divider?.width, DIVIDER_WIDTH_RANGE, d.divider.width)
    },
    border: {
      type: pick(s.border?.type, BORDER_TYPES, d.border.type),
      style: pick(s.border?.style, BORDER_STYLES, d.border.style),
      width: clamp(s.border?.width, BORDER_WIDTH_RANGE, d.border.width)
    },
    lineSpacing: clamp(s.lineSpacing, LINE_SPACING_RANGE, d.lineSpacing),
    sectionSpacing: pick(s.sectionSpacing, SECTION_SPACINGS.map((x) => x.id), d.sectionSpacing)
  }
}

export const getStyle = (resume) => normalizeStyle(resume?.settings?.style)

export function presetMatching(style) {
  const json = JSON.stringify(normalizeStyle(style))
  return PRESETS.find((p) => JSON.stringify(normalizeStyle(p.style)) === json)?.id || null
}

// jsPDF style name for a bold/italic pair
export const variantOf = ({ bold, italic }) => (bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal")

// The font file for a font id and variant
export function fontFile(id, variant) {
  const weight = variant === "bold" || variant === "bolditalic" ? 700 : 400
  const style = variant === "italic" || variant === "bolditalic" ? "italic" : "normal"
  return `/fonts/${id}-${weight}-${style}.ttf`
}
