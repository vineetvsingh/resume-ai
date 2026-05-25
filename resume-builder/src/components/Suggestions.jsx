import { useState } from "react"

export default function Suggestions({ onSuggest, loading, result, theme }) {
  const [context, setContext] = useState("")

  return (
    <div>
      <textarea
        style={{
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
          minHeight: "160px",
          boxSizing: "border-box"
        }}
        placeholder="Paste the job description or describe the role you are targeting..."
        value={context}
        onChange={(e) => setContext(e.target.value)}
      />
      <button
        onClick={() => onSuggest(context)}
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
        {loading ? "Generating..." : "Get Suggestions →"}
      </button>

      {result && (
        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Suggested Improvements</p>
          {(result.suggestions || []).filter(s => s && typeof s === "object").map((s, i) => (
            <div key={i} style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, borderRadius: "10px", padding: "14px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>{typeof s.section === "string" ? s.section : "Suggestion"}</span>
              {s.original && <p style={{ fontSize: "13px", fontWeight: 500, color: "#dc2626", textDecoration: "line-through", margin: "6px 0 4px" }}>{typeof s.original === "string" ? s.original : JSON.stringify(s.original)}</p>}
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#15803d", margin: 0, lineHeight: 1.6 }}>{typeof s.improved === "string" ? s.improved : JSON.stringify(s.improved)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}