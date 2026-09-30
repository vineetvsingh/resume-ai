const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
require("dotenv").config()

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add it to .env before starting the server.")
  process.exit(1)
}

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err))

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model("User", userSchema)

const resumeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: String,
  data: Object,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const Resume = mongoose.model("Resume", resumeSchema)

const scoreCheckSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  resumeId: { type: String, default: null },
  resumeName: String,
  jobSnippet: String,
  score: { type: Number, min: 0, max: 100, required: true },
  foundKeywords: [String],
  missingKeywords: [String],
  createdAt: { type: Date, default: Date.now }
})

const ScoreCheck = mongoose.model("ScoreCheck", scoreCheckSchema)

app.get("/", (req, res) => res.send("Resume API running"))

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" })
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: "Log in to continue" })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch (e) {
    res.status(401).json({ error: "Your session has expired. Log in again." })
  }
}

function readCredentials(body) {
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  return { email, password }
}

app.post("/auth/signup", async (req, res) => {
  const { email, password } = readCredentials(req.body)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address" })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" })
  }
  try {
    if (await User.exists({ email })) {
      return res.status(409).json({ error: "An account with this email already exists. Log in instead." })
    }
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 10) })
    res.json({ token: signToken(user), user: { email: user.email } })
  } catch (e) {
    res.status(500).json({ error: "Failed to create account" })
  }
})

app.post("/auth/login", async (req, res) => {
  const { email, password } = readCredentials(req.body)
  try {
    const user = await User.findOne({ email })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect" })
    }
    res.json({ token: signToken(user), user: { email: user.email } })
  } catch (e) {
    res.status(500).json({ error: "Failed to log in" })
  }
})

app.get("/auth/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).catch(() => null)
  if (!user) return res.status(401).json({ error: "Account not found. Log in again." })
  res.json({ user: { email: user.email } })
})

app.get("/resumes", requireAuth, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json(resumes)
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch resumes" })
  }
})

app.post("/resumes", requireAuth, async (req, res) => {
  const { name, data } = req.body
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required and must be a string" })
  }
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Data is required and must be an object" })
  }
  try {
    const resume = new Resume({ userId: req.userId, name: name.trim(), data })
    await resume.save()
    res.json(resume)
  } catch (e) {
    res.status(500).json({ error: "Failed to save resume" })
  }
})

app.delete("/resumes/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) {
      return res.status(404).json({ error: "Resume not found" })
    }
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: "Failed to delete resume" })
  }
})

app.post("/api/generate", async (req, res) => {
  const { prompt, systemPrompt } = req.body
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required and must be a string" })
  }
  if (!systemPrompt || typeof systemPrompt !== "string") {
    return res.status(400).json({ error: "systemPrompt is required and must be a string" })
  }
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500
      })
    })
    const data = await response.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: "Groq API call failed" })
  }
})

const PORT = process.env.PORT || 5000
const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
})

const Feedback = mongoose.model("Feedback", feedbackSchema)

app.post("/feedback", async (req, res) => {
  const { name, email, message } = req.body
  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "Message is required" })
  }
  try {
    const feedback = new Feedback({
      name: name || "Anonymous",
      email: email || "",
      message: message.trim()
    })
    await feedback.save()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: "Failed to save feedback" })
  }
})

app.put("/resumes/:id", requireAuth, async (req, res) => {
  const { name, data } = req.body
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required and must be a string" })
  }
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Data is required and must be an object" })
  }
  try {
    const updated = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name: name.trim(), data, updatedAt: new Date() },
      { returnDocument: 'after' }
    )
    if (!updated) {
      return res.status(404).json({ error: "Resume not found" })
    }
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: "Failed to update resume" })
  }
})

const toKeywordList = (v) =>
  Array.isArray(v) ? v.filter((k) => typeof k === "string").map((k) => k.trim().slice(0, 60)).filter(Boolean).slice(0, 40) : []

app.post("/scores", requireAuth, async (req, res) => {
  const { resumeId, resumeName, jobDescription, score, foundKeywords, missingKeywords } = req.body
  const numericScore = Number(score)
  if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
    return res.status(400).json({ error: "Score must be a number from 0 to 100" })
  }
  try {
    // Only link to a resume the user actually owns
    const ownedResume = typeof resumeId === "string" && mongoose.isValidObjectId(resumeId)
      ? await Resume.exists({ _id: resumeId, userId: req.userId })
      : null
    const check = await ScoreCheck.create({
      userId: req.userId,
      resumeId: ownedResume ? resumeId : null,
      resumeName: typeof resumeName === "string" ? resumeName.slice(0, 120) : "",
      jobSnippet: typeof jobDescription === "string" ? jobDescription.replace(/\s+/g, " ").trim().slice(0, 160) : "",
      score: Math.round(numericScore),
      foundKeywords: toKeywordList(foundKeywords),
      missingKeywords: toKeywordList(missingKeywords)
    })
    res.json(check)
  } catch (e) {
    res.status(500).json({ error: "Failed to save score" })
  }
})

app.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const [user, resumes, checks] = await Promise.all([
      User.findById(req.userId),
      Resume.find({ userId: req.userId }).sort({ updatedAt: -1, createdAt: -1 }),
      ScoreCheck.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50)
    ])
    if (!user) return res.status(401).json({ error: "Account not found. Log in again." })

    const latestScoreByResume = {}
    for (const c of checks) {
      if (c.resumeId && !(c.resumeId in latestScoreByResume)) latestScoreByResume[c.resumeId] = c.score
    }

    // Count each keyword once per check, case-insensitively, keeping the most recent spelling
    const gaps = new Map()
    for (const c of checks) {
      const seen = new Set()
      for (const k of c.missingKeywords) {
        const key = k.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const gap = gaps.get(key) || { keyword: k, count: 0 }
        gap.count += 1
        gaps.set(key, gap)
      }
    }
    const commonGaps = [...gaps.values()]
      .filter((g) => g.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    res.json({
      user: { email: user.email, createdAt: user.createdAt },
      displayName: resumes.find((r) => r.data?.name)?.data.name || null,
      stats: {
        resumeCount: resumes.length,
        checkCount: checks.length,
        checksThisMonth: checks.filter((c) => c.createdAt.getTime() >= monthAgo).length,
        bestScore: checks.length ? Math.max(...checks.map((c) => c.score)) : null
      },
      resumes: resumes.map((r) => ({
        _id: r._id,
        name: r.name,
        data: r.data,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt || r.createdAt,
        latestScore: latestScoreByResume[r._id.toString()] ?? null
      })),
      checks: checks.slice(0, 20),
      commonGaps
    })
  } catch (e) {
    res.status(500).json({ error: "Failed to load dashboard" })
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))