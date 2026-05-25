import { useState } from "react"
import { Mail, Send, User, ExternalLink } from "lucide-react"

export default function Footer({ theme }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) {
      setStatus({ type: "error", text: "Message cannot be empty." })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      })
      const data = await res.json()
      if (data.success) {
        setStatus({ type: "success", text: "Feedback sent! Thank you." })
        setName("")
        setEmail("")
        setMessage("")
      } else {
        setStatus({ type: "error", text: "Something went wrong. Try again." })
      }
    } catch (e) {
      setStatus({ type: "error", text: "Could not connect to server." })
    }
    setLoading(false)
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "inherit",
    background: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: "8px",
    color: theme.inputText,
    outline: "none",
    boxSizing: "border-box"
  }

  const linkStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: theme.textSecondary,
    textDecoration: "none",
    padding: "6px 0"
  }

  return (
    <div style={{
      borderTop: `1px solid ${theme.panelBorder}`,
      background: theme.bg,
      padding: typeof window !== "undefined" && window.innerWidth < 768 ? "32px 20px" : "48px 64px",
      display: "grid",
      gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 768 ? "1fr" : "1fr 1fr",
      gap: typeof window !== "undefined" && window.innerWidth < 768 ? "32px" : "64px",
      direction: typeof window !== "undefined" && window.innerWidth < 768 ? "rtl" : "ltr"
    }}>
      {/* Left — Contact info */}
      <div style={{ direction: "ltr" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Team</p>
        <h2 style={{ color: theme.text, fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>
            Vineet Vikram Singh
        </h2>
        <h2 style={{ color: theme.text, fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>
            Virat Shukla
        </h2>
        <h2 style={{ color: theme.text, fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "12px" }}>
            Vishal Kashyap
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: theme.textMuted }}></div>
            <span style={{ fontSize: "12px", color: theme.textMuted }}>Shambhunath Institute of Engineering Technology, Prayagraj</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <a href="mailto:smashvineer@gmail.com" style={linkStyle}>
            <Mail size={15} strokeWidth={1.8} />
            smashvineer@gmail.com
          </a>
          <a href="https://github.com/vineetvsingh" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            github.com/vineetvsingh
          </a>
          <a href="https://www.linkedin.com/in/vineetvsingh" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            linkedin.com/in/vineetvsingh
          </a>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: `1px solid ${theme.panelBorder}` }}>
          <p style={{ fontSize: "12px", color: theme.textMuted }}>
            Built with React, Node.js, MongoDB & Groq AI
          </p>
          <p style={{ fontSize: "12px", color: theme.textMuted, marginTop: "4px" }}>
            © {new Date().getFullYear()} ResumeAI — Final Year Project
          </p>
        </div>
      </div>

      {/* Right — Feedback form */}
      <div style={{ direction: "ltr" }}>
        <h3 style={{ color: theme.text, fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Send Feedback</h3>
        <p style={{ fontSize: "13px", color: theme.textMuted, marginBottom: "20px" }}>Found a bug or have a suggestion? Let me know.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 768 ? "1fr" : "1fr 1fr", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <User size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: theme.textMuted }} />
              <input
                style={{ ...inputStyle, paddingLeft: "32px" }}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div style={{ position: "relative" }}>
              <Mail size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: theme.textMuted }} />
              <input
                style={{ ...inputStyle, paddingLeft: "32px" }}
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <textarea
            style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
            placeholder="Your feedback..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "inherit",
              background: loading ? theme.inputBg : theme.buttonBg,
              color: loading ? theme.textMuted : theme.buttonText,
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              width: "fit-content"
            }}
          >
            <Send size={14} strokeWidth={2} />
            {loading ? "Sending..." : "Send Feedback"}
          </button>

          {status && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              background: status.type === "success" ? "rgba(21,128,61,0.1)" : "rgba(220,38,38,0.1)",
              border: `1px solid ${status.type === "success" ? "rgba(21,128,61,0.3)" : "rgba(220,38,38,0.3)"}`,
              color: status.type === "success" ? "#15803d" : "#dc2626"
            }}>
              {status.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}