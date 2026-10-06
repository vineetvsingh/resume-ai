import { useEffect, useRef } from "react"
import { X, RotateCcw } from "lucide-react"
import {
  FONTS, PRESETS, SIZE_RANGES, LINE_SPACING_RANGE, DIVIDER_WIDTH_RANGE, BORDER_WIDTH_RANGE,
  DIVIDER_STYLES, BORDER_TYPES, BORDER_STYLES, SECTION_SPACINGS, presetMatching, cssFamily
} from "../resumeStyle"

const cap = (s) => s[0].toUpperCase() + s.slice(1)

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={`seg-btn${value === o.id ? " is-on" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Slider({ label, value, range, step, unit, onChange, format = (v) => v }) {
  return (
    <label className="design-row">
      <span className="design-label">{label}</span>
      <input type="range" min={range[0]} max={range[1]} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="design-value">{format(value)}{unit}</span>
    </label>
  )
}

function FontSelect({ label, value, onChange }) {
  return (
    <label className="design-row">
      <span className="design-label">{label}</span>
      <select className="input design-select" value={value} onChange={(e) => onChange(e.target.value)} style={{ fontFamily: cssFamily(value) }}>
        {["Serif", "Sans"].map((kind) => (
          <optgroup key={kind} label={kind}>
            {FONTS.filter((f) => f.kind === kind).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

function TextToggles({ label, value, onChange }) {
  const toggle = (key) => onChange({ ...value, [key]: !value[key] })
  return (
    <div className="design-row">
      <span className="design-label">{label}</span>
      <div className="toggles">
        <button type="button" aria-pressed={value.bold} className="toggle" onClick={() => toggle("bold")} aria-label={`${label} bold`}><b>B</b></button>
        <button type="button" aria-pressed={value.italic} className="toggle" onClick={() => toggle("italic")} aria-label={`${label} italic`}><i>I</i></button>
        <button type="button" aria-pressed={value.upper} className="toggle" onClick={() => toggle("upper")} aria-label={`${label} uppercase`}>AA</button>
      </div>
    </div>
  )
}

export default function DesignPanel({ style, onChange, onPreset, onReset, onApplyAll, canApplyAll, applying, pageNote, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const set = (patch) => onChange({ ...style, ...patch })
  const preset = presetMatching(style)

  return (
    <aside className="design-panel" aria-label="Design">
      <div className="design-head">
        <h2 className="drawer-title">Design</h2>
        <button ref={closeRef} onClick={onClose} className="icon-btn" aria-label="Close design panel"><X size={17} /></button>
      </div>
      <p className="design-sub">Changes show in the preview straight away, and the PDF matches them exactly.</p>
      {pageNote && <div className="page-warning design-note" role="alert">{pageNote}</div>}

      <section className="design-group">
        <h3 className="design-h">Presets</h3>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`preset${preset === p.id ? " is-on" : ""}`} aria-pressed={preset === p.id} onClick={() => onPreset(p.id)}>
              <span className="preset-sample" style={{ fontFamily: cssFamily(p.style.headingFont) }}>Aa</span>
              {p.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onReset} className="link-btn design-reset"><RotateCcw size={13} /> Reset to default</button>
      </section>

      <section className="design-group">
        <h3 className="design-h">Fonts</h3>
        <FontSelect label="Headings" value={style.headingFont} onChange={(v) => set({ headingFont: v })} />
        <FontSelect label="Body text" value={style.bodyFont} onChange={(v) => set({ bodyFont: v })} />
      </section>

      <section className="design-group">
        <h3 className="design-h">Sizes</h3>
        {[["name", "Name"], ["heading", "Headings"], ["subheading", "Subheadings"], ["body", "Body text"]].map(([key, label]) => (
          <Slider key={key} label={label} value={style.sizes[key]} range={SIZE_RANGES[key]} step={0.5} unit=" pt"
            onChange={(v) => set({ sizes: { ...style.sizes, [key]: v } })} />
        ))}
        <h4 className="design-h4">Text style</h4>
        <TextToggles label="Name" value={style.text.name} onChange={(v) => set({ text: { ...style.text, name: v } })} />
        <TextToggles label="Headings" value={style.text.heading} onChange={(v) => set({ text: { ...style.text, heading: v } })} />
        <TextToggles label="Subheadings" value={style.text.subheading} onChange={(v) => set({ text: { ...style.text, subheading: v } })} />
      </section>

      <section className="design-group">
        <h3 className="design-h">Lines &amp; borders</h3>
        <label className="design-row check-field">
          <input type="checkbox" checked={style.divider.show} onChange={(e) => set({ divider: { ...style.divider, show: e.target.checked } })} />
          <span>Line under section headings</span>
        </label>
        {style.divider.show && (
          <>
            <div className="design-row">
              <span className="design-label">Line style</span>
              <Segmented label="Divider style" value={style.divider.style} options={DIVIDER_STYLES.map((s) => ({ id: s, label: cap(s) }))}
                onChange={(v) => set({ divider: { ...style.divider, style: v } })} />
            </div>
            <Slider label="Thickness" value={style.divider.width} range={DIVIDER_WIDTH_RANGE} step={0.25} unit=" pt"
              onChange={(v) => set({ divider: { ...style.divider, width: v } })} />
          </>
        )}
        <div className="design-row">
          <span className="design-label">Page border</span>
          <Segmented label="Page border" value={style.border.type} options={BORDER_TYPES.map((s) => ({ id: s, label: cap(s) }))}
            onChange={(v) => set({ border: { ...style.border, type: v } })} />
        </div>
        {style.border.type !== "none" && (
          <>
            <div className="design-row">
              <span className="design-label">Border style</span>
              <Segmented label="Border style" value={style.border.style} options={BORDER_STYLES.map((s) => ({ id: s, label: cap(s) }))}
                onChange={(v) => set({ border: { ...style.border, style: v } })} />
            </div>
            <Slider label="Thickness" value={style.border.width} range={BORDER_WIDTH_RANGE} step={0.25} unit=" pt"
              onChange={(v) => set({ border: { ...style.border, width: v } })} />
          </>
        )}
      </section>

      <section className="design-group">
        <h3 className="design-h">Spacing</h3>
        <Slider label="Line spacing" value={style.lineSpacing} range={LINE_SPACING_RANGE} step={0.05} unit=""
          format={(v) => v.toFixed(2)} onChange={(v) => set({ lineSpacing: Math.round(v * 100) / 100 })} />
        <div className="design-row">
          <span className="design-label">Between sections</span>
          <Segmented label="Section spacing" value={style.sectionSpacing} options={SECTION_SPACINGS} onChange={(v) => set({ sectionSpacing: v })} />
        </div>
      </section>

      <section className="design-group design-apply">
        <button type="button" onClick={onApplyAll} disabled={applying} className="btn btn-ghost btn-block">
          {applying ? "Applying…" : "Apply to all my resumes"}
        </button>
        <p className="design-sub">{canApplyAll ? "Copies this design to every resume and version you have saved." : "Log in to copy this design to all your saved resumes."}</p>
      </section>
    </aside>
  )
}
