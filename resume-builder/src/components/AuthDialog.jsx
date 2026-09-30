import { useState, useEffect, useRef } from "react"
import { api, setToken } from "../auth"

export default function AuthDialog({ reason, onClose, onAuthed }) {
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef(null)
  const nameRef = useRef(null)

  useEffect(() => {
    (mode === "signup" ? nameRef : emailRef).current?.focus()
  }, [mode])

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const isLogin = mode === "login"

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await api(isLogin ? "/auth/login" : "/auth/signup", { method: "POST", body: isLogin ? { email, password } : { name, email, password } })
      setToken(data.token)
      onAuthed(data.user)
    } catch (err) {
      setError(err.status ? err.message : "Could not reach the server. Check that the backend is running.")
    }
    setLoading(false)
  }

  return (
    <>
      <div className="scrim" onClick={onClose}></div>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <h2 id="auth-title" className="drawer-title">{isLogin ? "Log in" : "Create an account"}</h2>
        <p className="dialog-sub">{reason || "Your saved resumes are private to your account."}</p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <label className="field">
              <span className="field-label">Your name</span>
              <input ref={nameRef} className="input" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span className="field-label">Email</span>
            <input ref={emailRef} className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">
              Password
              {!isLogin && <span className="field-hint"> (at least 8 characters)</span>}
            </span>
            <input
              className="input"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={isLogin ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <div className="alert" role="alert">{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-block dialog-submit">
            {loading ? (isLogin ? "Logging in…" : "Creating account…") : (isLogin ? "Log in" : "Create account")}
          </button>
        </form>

        <p className="dialog-switch">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button type="button" className="link-btn" onClick={() => { setMode(isLogin ? "signup" : "login"); setError(null) }}>
            {isLogin ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </>
  )
}
