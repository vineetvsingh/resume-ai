import { LENGTHS } from "../resumeLayout"

// Concise / Balanced / Detailed, as a row of radio buttons
export default function LengthPicker({ value, onChange, disabled, compact, name = "length" }) {
  const current = LENGTHS.find((l) => l.id === value) || LENGTHS[1]
  return (
    <div className={`length-picker${compact ? " is-compact" : ""}`}>
      <div className="length-options" role="radiogroup" aria-label="Content length">
        {LENGTHS.map((l) => (
          <label key={l.id} className={`length-option${l.id === value ? " is-selected" : ""}`}>
            <input
              type="radio"
              name={name}
              value={l.id}
              checked={l.id === value}
              disabled={disabled}
              onChange={() => onChange(l.id)}
            />
            <span>{l.label}</span>
          </label>
        ))}
      </div>
      {!compact && <p className="length-hint">{current.hint}</p>}
    </div>
  )
}
