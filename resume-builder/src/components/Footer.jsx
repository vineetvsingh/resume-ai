import { useState } from "react"
import { Mail, Send } from "lucide-react"

export default function Footer() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) {
      setStatus({ type: "error", text: "Write a message before sending." })
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
        setStatus({ type: "success", text: "Feedback sent. Thank you." })
        setName("")
        setEmail("")
        setMessage("")
      } else {
        setStatus({ type: "error", text: "Feedback was not sent. Try again." })
      }
    } catch (e) {
      setStatus({ type: "error", text: "Could not reach the server. Check that the backend is running." })
    }
    setLoading(false)
  }

  return (
    <footer className="footer">
      <div>
        <h2 className="footer-h">Made by</h2>
        <ul className="footer-team">
          <li>Vineet Vikram Singh</li>
          <li>Virat Shukla</li>
          <li>Vishal Kashyap</li>
        </ul>
        <p className="footer-college">Shambhunath Institute of Engineering Technology, Prayagraj</p>

        <div className="footer-links">
          <a href="mailto:smashvineer@gmail.com" className="footer-link">
            <Mail size={15} strokeWidth={1.8} />
            smashvineer@gmail.com
          </a>
          <a href="https://github.com/vineetvsingh" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            github.com/vineetvsingh
          </a>
          <a href="https://www.linkedin.com/in/vineetvsingh" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            linkedin.com/in/vineetvsingh
          </a>
        </div>

        <div className="footer-meta">
          <p>Built with React, Node.js, MongoDB and Groq AI</p>
          <p>© {new Date().getFullYear()} ResumeAI, a final year project</p>
        </div>
      </div>

      <div>
        <h2 className="footer-h">Send feedback</h2>
        <p className="footer-sub">Found a bug or have an idea? Tell us.</p>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Message</span>
          <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>

        <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
          <Send size={15} strokeWidth={2} />
          {loading ? "Sending…" : "Send feedback"}
        </button>

        {status && (
          <div className={status.type === "success" ? "alert alert-ok" : "alert"} role="status">
            {status.text}
          </div>
        )}
      </div>
    </footer>
  )
}
