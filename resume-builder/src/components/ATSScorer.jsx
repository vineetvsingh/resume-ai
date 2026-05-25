import { useState } from "react"

export default function ATSScorer({ onScore, loading, result, theme }) {
  const [jd, setJd] = useState("")

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "inherit",
    background: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: "8px",
    color: theme.inputText,
    marginBottom: "8px",
    outline: "none",
    resize: "vertical",
    minHeight: "200px",
    boxSizing: "border-box"
  }

  return (
    <div>
      <textarea
        style={inputStyle}
        placeholder="Paste the full job description here..."
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <button
        onClick={() => onScore(jd)}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "inherit",
          background: loading ? theme.inputBg : theme.buttonBg,
          color: loading ? theme.textMuted : theme.buttonText,
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Analyzing..." : "Analyze Match →"}
      </button>

      {result && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: theme.textSecondary }}>Match Score</span>
            <span style={{ fontSize: "36px", fontWeight: 700, color: result.score >= 70 ? "#22c55e" : result.score >= 45 ? "#f59e0b" : "#ef4444", letterSpacing: "-0.03em" }}>
              {result.score}<span style={{ fontSize: "18px", color: theme.textMuted }}>%</span>
            </span>
          </div>
          <div style={{ height: "4px", background: theme.inputBg, borderRadius: "2px", marginBottom: "16px" }}>
            <div style={{ height: "100%", borderRadius: "2px", width: `${result.score}%`, background: result.score >= 70 ? "#22c55e" : result.score >= 45 ? "#f59e0b" : "#ef4444", transition: "width 0.6s ease" }} />
          </div>

          {result.summary && <p style={{ fontSize: "13px", color: theme.textSecondary, marginBottom: "16px", lineHeight: 1.6 }}>{result.summary}</p>}

          {result.foundKeywords?.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Found</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {result.foundKeywords.map((k, i) => (
                  <span key={i} style={{ background: "rgba(21, 128, 61, 0.12)", color: "#15803d", fontSize: "12px", fontWeight: 500, padding: "3px 10px", borderRadius: "4px", border: "1px solid rgba(21, 128, 61, 0.3)" }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {result.missingKeywords?.length > 0 && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Missing</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {result.missingKeywords.map((k, i) => (
                  <span key={i} style={{ background: "rgba(220, 38, 38, 0.12)", color: "#dc2626", fontSize: "12px", fontWeight: 500, padding: "3px 10px", borderRadius: "4px", border: "1px solid rgba(220, 38, 38, 0.3)" }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}