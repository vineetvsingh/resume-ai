import { useState } from "react"

function verdict(score) {
  if (score >= 70) return { text: "Strong match", color: "var(--ok)" }
  if (score >= 45) return { text: "Partial match", color: "var(--warn)" }
  return { text: "Weak match", color: "var(--pen)" }
}

export default function ATSScorer({ onScore, loading, result, onPlan }) {
  const [jd, setJd] = useState("")
  const v = result ? verdict(result.score) : null

  return (
    <div>
      <label className="field">
        <span className="field-label">Job description</span>
        <textarea
          className="input input-tall"
          placeholder="Paste the full job description here"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
      </label>
      <button onClick={() => onScore(jd)} disabled={loading} className="btn btn-primary btn-block">
        {loading ? "Analyzing…" : "Analyze match"}
      </button>

      {result && (
        <div className="result">
          <div className="score">
            <span className="score-num">{result.score}<small>%</small></span>
            <span className="score-verdict" style={{ color: v.color }}>{v.text}</span>
          </div>
          <div className="meter" role="meter" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={100} aria-label="Match score">
            <div style={{ width: `${result.score}%`, background: v.color }} />
          </div>

          {result.summary && <p className="result-summary">{result.summary}</p>}

          {result.foundKeywords?.length > 0 && (
            <div className="kw-group">
              <h3 className="kw-title">Keywords you already have</h3>
              <div className="kw-list">
                {result.foundKeywords.map((k, i) => <span key={i} className="kw-found">{k}</span>)}
              </div>
            </div>
          )}

          {result.missingKeywords?.length > 0 && (
            <div className="kw-group">
              <h3 className="kw-title">Keywords to add</h3>
              <p className="kw-hint">Tap a keyword to get a short plan for actually learning it.</p>
              <div className="kw-list">
                {result.missingKeywords.map((k, i) => (
                  <button key={i} className="kw-missing kw-plan" onClick={() => onPlan(k)} title={`Get a plan to learn ${k}`}>{k}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
