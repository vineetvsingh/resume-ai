const STEPS = [
  { title: "Build", text: "Enter your details and ResumeAI drafts a one-page resume you can edit line by line." },
  { title: "Check your ATS match", text: "Paste a job description to see which keywords you cover and which are missing." },
  { title: "Improve", text: "Get specific rewrites for weak lines, then download the finished PDF." }
]

export default function Landing({ currentResume, onStart, onContinue, onLogin }) {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="landing-copy">
          <h1 className="landing-title">Build a resume that gets past the screening software</h1>
          <p className="landing-lede">
            ResumeAI writes a clean one-page resume from your details, checks it against a real job description, and tells you exactly what to fix.
          </p>
          <div className="landing-actions">
            {currentResume ? (
              <>
                <button onClick={onContinue} className="btn btn-primary">Continue editing</button>
                <button onClick={onStart} className="btn btn-ghost">Start over</button>
              </>
            ) : (
              <button onClick={onStart} className="btn btn-primary">Start building</button>
            )}
            <button onClick={onLogin} className="btn btn-ghost">Log in</button>
          </div>
          <p className="landing-note">No account needed to build. Log in to save resumes and track your ATS scores over time.</p>
        </div>

        <div className="specimen" aria-hidden="true">
          <p className="specimen-name">Aarav Sharma</p>
          <p className="specimen-contact">aarav@example.com / +91 98765 43210</p>
          <p className="specimen-h">Skills</p>
          <p>
            <mark>React</mark>, <mark>Node.js</mark>, MongoDB, Python, <mark>REST APIs</mark>, <span className="specimen-miss">AWS</span>
          </p>
          <p className="specimen-h">Projects</p>
          <p>
            <strong>CampusCart:</strong> <s>Made a website for students</s>
            <span className="specimen-fix">Built a hostel marketplace in Express and MongoDB used by 300+ students</span>
          </p>
          <p className="specimen-score"><span>74%</span> match for Frontend Developer</p>
        </div>
      </section>

      <section className="landing-steps" aria-label="How it works">
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="step-num" aria-hidden="true">{i + 1}</span>
              <h2 className="step-title">{step.title}</h2>
              <p className="step-text">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
