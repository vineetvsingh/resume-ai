import { useState } from "react"

const asText = (v) => (typeof v === "string" ? v : JSON.stringify(v))

export default function Suggestions({ onSuggest, loading, result }) {
  const [context, setContext] = useState("")
  const suggestions = (result?.suggestions || []).filter(s => s && typeof s === "object")

  return (
    <div>
      <label className="field">
        <span className="field-label">Target role or job description</span>
        <textarea
          className="input input-tall"
          placeholder="Paste a job description, or describe the role you are aiming for"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </label>
      <button onClick={() => onSuggest(context)} disabled={loading} className="btn btn-primary btn-block">
        {loading ? "Reviewing…" : "Get suggestions"}
      </button>

      {suggestions.length > 0 && (
        <div className="result">
          <ol className="edits">
            {suggestions.map((s, i) => (
              <li key={i} className="edit">
                <p className="edit-section">{typeof s.section === "string" ? s.section : "Suggestion"}</p>
                {s.original && <p className="edit-old">{asText(s.original)}</p>}
                <p className="edit-new">{asText(s.improved)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
