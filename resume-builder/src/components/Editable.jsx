import { useState } from "react"
import { richRuns, bulletsOf, descParagraph } from "../resumeData"

// Text that turns into an input when clicked. `display` can render the saved value differently.
export function EditableText({ value, onChange, multiline, block, placeholder, display, hint }) {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  if (editing) {
    const Tag = multiline ? "textarea" : "input"
    return (
      <>
        <Tag
          autoFocus
          className="editable-input"
          value={tempValue}
          placeholder={placeholder}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => { onChange(tempValue); setEditing(false) }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !multiline) { onChange(tempValue); setEditing(false) }
            if (e.key === "Escape") { setTempValue(value); setEditing(false) }
          }}
        />
        {hint && <span className="editable-hint">{hint}</span>}
      </>
    )
  }
  const start = () => { setTempValue(value || ""); setEditing(true) }
  return (
    <span
      className="editable"
      role="button"
      tabIndex={0}
      onClick={start}
      onKeyDown={(e) => { if (e.key === "Enter") start() }}
      style={{ display: block ? "block" : "inline" }}
    >
      {value ? (display ? display(value) : value) : <span className="editable-empty">{placeholder || "Click to edit"}</span>}
    </span>
  )
}

// Text with **bold** markers shown in bold
export function Rich({ text }) {
  return richRuns(text).map((r, i) => (r.bold ? <strong key={i}>{r.text}</strong> : <span key={i}>{r.text}</span>))
}

// An entry description: bullets for the LaTeX layout, one paragraph for the others
export function Description({ value, onChange, asBullets }) {
  return (
    <EditableText
      value={value}
      multiline
      block
      onChange={onChange}
      placeholder={asBullets ? "Add bullet points, one per line" : "Description"}
      hint={asBullets ? "One bullet per line. Wrap words in **double asterisks** to bold them." : null}
      display={(v) => asBullets
        ? <ul className="tpl-bullets">{bulletsOf(v).map((b, i) => <li key={i}><Rich text={b} /></li>)}</ul>
        : descParagraph(v)}
    />
  )
}
