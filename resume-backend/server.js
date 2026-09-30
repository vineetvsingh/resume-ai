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

// Profile fields a user can edit, with their maximum lengths
const PROFILE_FIELDS = {
  name: 80,
  phone: 30,
  location: 80,
  college: 120,
  cgpa: 20,
  graduationYear: 4,
  targetRole: 80,
  linkedin: 200,
  github: 200,
  portfolio: 200
}
const PROFILE_LABELS = {
  name: "Name",
  phone: "Phone",
  location: "City",
  college: "College",
  cgpa: "CGPA",
  graduationYear: "Graduation year",
  targetRole: "Target role",
  linkedin: "LinkedIn link",
  github: "GitHub link",
  portfolio: "Portfolio link"
}
const LINK_FIELDS = ["linkedin", "github", "portfolio"]

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  profile: Object.fromEntries(Object.keys(PROFILE_FIELDS).map((k) => [k, { type: String, default: "" }])),
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

function publicUser(user) {
  const profile = Object.fromEntries(Object.keys(PROFILE_FIELDS).map((k) => [k, user.profile?.[k] || ""]))
  return { email: user.email, createdAt: user.createdAt, profile }
}

// Returns { profile } with trimmed values, or { error } describing the first invalid field
function cleanProfile(input) {
  const profile = {}
  for (const [key, max] of Object.entries(PROFILE_FIELDS)) {
    const raw = input?.[key]
    if (raw === undefined || raw === null) continue
    if (typeof raw !== "string") return { error: `${PROFILE_LABELS[key]} must be text` }
    const value = raw.trim()
    if (value.length > max) return { error: `${PROFILE_LABELS[key]} must be at most ${max} characters` }
    profile[key] = value
  }
  if (profile.graduationYear && !/^\d{4}$/.test(profile.graduationYear)) {
    return { error: "Graduation year must be a 4-digit year" }
  }
  for (const key of LINK_FIELDS) {
    if (profile[key] && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(profile[key])) {
      return { error: `Enter a valid ${PROFILE_LABELS[key]}` }
    }
  }
  return { profile }
}

function readCredentials(body) {
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  return { email, password }
}

app.post("/auth/signup", async (req, res) => {
  const { email, password } = readCredentials(req.body)
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
  if (!name) {
    return res.status(400).json({ error: "Enter your name" })
  }
  if (name.length > PROFILE_FIELDS.name) {
    return res.status(400).json({ error: `Name must be at most ${PROFILE_FIELDS.name} characters` })
  }
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
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 10), profile: { name } })
    res.json({ token: signToken(user), user: publicUser(user) })
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
    res.json({ token: signToken(user), user: publicUser(user) })
  } catch (e) {
    res.status(500).json({ error: "Failed to log in" })
  }
})

app.get("/auth/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).catch(() => null)
  if (!user) return res.status(401).json({ error: "Account not found. Log in again." })
  res.json({ user: publicUser(user) })
})

app.put("/profile", requireAuth, async (req, res) => {
  const { profile, error } = cleanProfile(req.body)
  if (error) return res.status(400).json({ error })
  if (profile.name === "") return res.status(400).json({ error: "Name cannot be empty" })
  try {
    const update = Object.fromEntries(Object.entries(profile).map(([k, v]) => [`profile.${k}`, v]))
    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { returnDocument: "after" })
    if (!user) return res.status(401).json({ error: "Account not found. Log in again." })
    res.json({ user: publicUser(user) })
  } catch (e) {
    res.status(500).json({ error: "Failed to save profile" })
  }
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
    await ScoreCheck.updateMany(
      { userId: req.userId, resumeId: null, resumeName: resume.name },
      { $set: { resumeId: resume._id.toString() } }
    )
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
    await ScoreCheck.deleteMany({
      userId: req.userId,
      $or: [
        { resumeId: deleted._id.toString() },
        { resumeId: null, resumeName: deleted.name }
      ]
    })
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

// ---------- Skill gap roadmaps ----------
// A personal plan for learning one missing keyword, with a project that proves it

const roadmapSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  key: { type: String, required: true }, // lowercased keyword, unique per user
  keyword: { type: String, required: true },
  targetRole: String,
  plan: Object,
  done: { type: [String], default: [] },
  learnedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
roadmapSchema.index({ userId: 1, key: 1 }, { unique: true })

const Roadmap = mongoose.model("Roadmap", roadmapSchema)

async function askGroqForJSON(systemPrompt, prompt, maxTokens) {
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
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    })
  })
  const data = await response.json()
  const text = (data.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("No JSON in AI response")
  return JSON.parse(match[0])
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "")
// Accepts ["text"] or [{ task: "text" }]-style lists, since the model varies its format
const itemText = (x) => (typeof x === "string" ? x : x && (x.text || x.task || x.title || x.description || x.name))
const strList = (v, maxItems, maxLen) =>
  Array.isArray(v) ? v.map((x) => str(itemText(x), maxLen)).filter(Boolean).slice(0, maxItems) : []

// Keep only the fields we render, and give every task a stable id for progress tracking
function normalizePlan(raw) {
  const weeks = (Array.isArray(raw.weeks) ? raw.weeks : []).slice(0, 4).map((w, wi) => ({
    focus: str(w?.title || w?.focus, 80).replace(/^week\s*\d+\s*[:\-–]?\s*/i, ""),
    tasks: strList(w?.tasks, 5, 200).map((text, ti) => ({ id: `w${wi}t${ti}`, text }))
  }))
    .filter((w) => w.tasks.length > 0)
    .map((w, i) => ({ title: w.focus ? `Week ${i + 1}: ${w.focus}` : `Week ${i + 1}`, tasks: w.tasks }))
  const project = {
    title: str(raw.project?.title, 80),
    description: str(raw.project?.description, 400),
    steps: strList(raw.project?.steps, 6, 200)
  }
  if (weeks.length < 2 || !project.title) throw new Error("AI plan was incomplete")
  return {
    summary: str(raw.summary, 400),
    why: str(raw.why, 400),
    weeks,
    resources: strList(raw.resources, 6, 120),
    project: { ...project, id: "project" },
    resumeLine: str(raw.resumeLine, 250)
  }
}

function taskIds(plan) {
  return [...plan.weeks.flatMap((w) => w.tasks.map((t) => t.id)), plan.project.id]
}

function roadmapSummary(r) {
  const total = taskIds(r.plan).length
  return { _id: r._id, keyword: r.keyword, total, done: r.done.length, learned: Boolean(r.learnedAt) }
}

app.post("/roadmaps", requireAuth, async (req, res) => {
  const keyword = str(req.body?.keyword, 60)
  if (!keyword) return res.status(400).json({ error: "Choose a keyword to plan for" })
  const key = keyword.toLowerCase()
  try {
    const existing = await Roadmap.findOne({ userId: req.userId, key })
    if (existing) return res.json(existing)

    const [user, latestResume, checks] = await Promise.all([
      User.findById(req.userId),
      Resume.findOne({ userId: req.userId }).sort({ updatedAt: -1, createdAt: -1 }),
      ScoreCheck.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50)
    ])
    const targetRole = user?.profile?.targetRole || "software engineering roles"
    const skills = (latestResume?.data?.skillsList || []).slice(0, 20).join(", ") || "not listed"
    const jobsAsking = checks
      .filter((c) => c.missingKeywords.some((k) => k.toLowerCase() === key))
      .map((c) => c.jobSnippet)
      .filter(Boolean)
      .slice(0, 3)

    const prompt = `A final-year computer science student in India wants to genuinely learn "${keyword}" because job descriptions keep asking for it and their resume lacks it.
Target role: ${targetRole}
Skills they already have: ${skills}
Jobs that asked for it: ${jobsAsking.length ? jobsAsking.join(" | ") : "not recorded"}

Make a realistic 2 to 3 week plan for about 1 hour a day that builds on the skills they already have. Give each week 3 or 4 separate tasks, each a short action under 20 words. List 3 to 5 resources. Recommend only free resources, named without URLs (for example "Official Docker docs: Get started", "freeCodeCamp", "NPTEL"). The project must be small enough to finish in a few days and must use "${keyword}" for real, so the student can honestly put it on their resume.

Return ONLY a JSON object with no markdown or backticks:
{"summary":"one or two plain sentences on what ${keyword} is","why":"one or two sentences on why employers hiring for ${targetRole} ask for it","weeks":[{"title":"Week 1: short focus","tasks":["short task","short task","short task"]}],"resources":["free resource name"],"project":{"title":"","description":"two sentences","steps":["step"]},"resumeLine":"one resume bullet describing the finished project, naming ${keyword}"}`

    // The model occasionally returns an incomplete plan, so allow one retry
    let plan
    for (let attempt = 1; attempt <= 2 && !plan; attempt++) {
      try {
        plan = normalizePlan(await askGroqForJSON("You are a practical career mentor for Indian CS students. Return only valid JSON, no markdown, no backticks.", prompt, 2500))
      } catch (e) {
        console.error(`Roadmap generation attempt ${attempt} failed:`, e.message)
      }
    }
    if (!plan) {
      return res.status(502).json({ error: "The AI could not make a plan right now. Try again in a moment." })
    }

    const roadmap = await Roadmap.create({ userId: req.userId, key, keyword, targetRole, plan })
    res.json(roadmap)
  } catch (e) {
    if (e.code === 11000) {
      const existing = await Roadmap.findOne({ userId: req.userId, key })
      if (existing) return res.json(existing)
    }
    res.status(500).json({ error: "Failed to create plan" })
  }
})

app.get("/roadmaps/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Plan not found" })
  const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.userId }).catch(() => null)
  if (!roadmap) return res.status(404).json({ error: "Plan not found" })
  res.json(roadmap)
})

app.patch("/roadmaps/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Plan not found" })
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.userId })
    if (!roadmap) return res.status(404).json({ error: "Plan not found" })
    const valid = new Set(taskIds(roadmap.plan))
    const done = Array.isArray(req.body?.done) ? [...new Set(req.body.done.filter((id) => valid.has(id)))] : null
    if (!done) return res.status(400).json({ error: "done must be a list of task ids" })
    roadmap.done = done
    roadmap.learnedAt = done.length === valid.size ? roadmap.learnedAt || new Date() : null
    roadmap.updatedAt = new Date()
    await roadmap.save()
    res.json(roadmap)
  } catch (e) {
    res.status(500).json({ error: "Failed to save progress" })
  }
})

app.delete("/roadmaps/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Plan not found" })
  const deleted = await Roadmap.findOneAndDelete({ _id: req.params.id, userId: req.userId }).catch(() => null)
  if (!deleted) return res.status(404).json({ error: "Plan not found" })
  res.json({ success: true })
})

app.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const [user, resumes, allChecks, allRoadmaps] = await Promise.all([
      User.findById(req.userId),
      Resume.find({ userId: req.userId }).sort({ updatedAt: -1, createdAt: -1 }),
      ScoreCheck.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100),
      Roadmap.find({ userId: req.userId }).sort({ updatedAt: -1 })
    ])
    if (!user) return res.status(401).json({ error: "Account not found. Log in again." })

    // A check counts only while its resume exists. Older checks may only carry the resume's name.
    const resumeIds = new Set(resumes.map((r) => r._id.toString()))
    const idByName = {}
    for (const r of resumes) if (!(r.name in idByName)) idByName[r.name] = r._id.toString()
    const checks = allChecks
      .map((c) => {
        const id = c.resumeId && resumeIds.has(c.resumeId) ? c.resumeId : !c.resumeId ? idByName[c.resumeName] : null
        if (!id) return null
        const check = c.toObject()
        check.resumeId = id
        return check
      })
      .filter(Boolean)
      .slice(0, 50)

    // Hide untouched plans whose keyword no longer shows up in any remaining check
    const missingNow = new Set(checks.flatMap((c) => c.missingKeywords.map((k) => k.toLowerCase())))
    const roadmaps = allRoadmaps.filter((r) => r.done.length > 0 || missingNow.has(r.key))

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
      user: publicUser(user),
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
      commonGaps,
      roadmaps: roadmaps.map(roadmapSummary)
    })
  } catch (e) {
    res.status(500).json({ error: "Failed to load dashboard" })
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))