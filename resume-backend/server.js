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
  parentId: { type: String, default: null, index: true }, // set on versions; null on masters
  label: { type: String, default: "" },
  target: { type: Object, default: null }, // { company, role, jobDescription } for a version's job
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
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Resume not found" })
    const deleted = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!deleted) {
      return res.status(404).json({ error: "Resume not found" })
    }
    const versions = deleted.parentId ? [] : await Resume.find({ userId: req.userId, parentId: deleted._id.toString() })
    if (versions.length) await Resume.deleteMany({ _id: { $in: versions.map((v) => v._id) } })
    const removedIds = [deleted, ...versions].map((r) => r._id.toString())
    await ScoreCheck.deleteMany({
      userId: req.userId,
      $or: [
        { resumeId: { $in: removedIds } },
        ...(deleted.parentId ? [] : [{ resumeId: null, resumeName: deleted.name }])
      ]
    })
    res.json({ success: true, deletedVersions: versions.length })
  } catch (e) {
    res.status(500).json({ error: "Failed to delete resume" })
  }
})

const BUSY_MESSAGE = "The AI is busy right now. Try again in a minute."
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Seconds Groq asks us to wait, from "Please try again in 7.2s" (or 1m3s), or null
function retryAfterSeconds(data) {
  const m = String(data?.error?.message || "").match(/try again in (?:(\d+)m)?([\d.]+)s/)
  return m ? Number(m[1] || 0) * 60 + Number(m[2]) : null
}

// Calls Groq's chat API; on a rate limit, waits once if the wait is short, otherwise throws a "busy" error
async function groqChat(body) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify(body)
    })
    const data = await response.json()
    if (response.status !== 429) return data
    const wait = retryAfterSeconds(data)
    if (attempt === 1 && wait !== null && wait <= 12) {
      await sleep(wait * 1000 + 250)
      continue
    }
    const err = new Error(BUSY_MESSAGE)
    err.busy = true
    throw err
  }
}

app.post("/api/generate", async (req, res) => {
  const { prompt, systemPrompt } = req.body
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required and must be a string" })
  }
  if (!systemPrompt || typeof systemPrompt !== "string") {
    return res.status(400).json({ error: "systemPrompt is required and must be a string" })
  }
  try {
    const data = await groqChat({
      model: "openai/gpt-oss-20b",
      reasoning_effort: "low",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500
    })
    if (data.error) return res.status(502).json({ error: "The AI could not answer right now. Try again in a moment." })
    res.json(data)
  } catch (e) {
    if (e.busy) return res.status(503).json({ error: BUSY_MESSAGE })
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
      ? await Resume.findOne({ _id: resumeId, userId: req.userId }, { label: 1 })
      : null
    const check = await ScoreCheck.create({
      userId: req.userId,
      resumeId: ownedResume ? resumeId : null,
      resumeName: ownedResume?.label || (typeof resumeName === "string" ? resumeName.slice(0, 120) : ""),
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
  const data = await groqChat({
    model: "openai/gpt-oss-20b",
    reasoning_effort: "low",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    max_tokens: maxTokens,
    response_format: { type: "json_object" }
  })
  const text = (data.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    // Say why, so failures in the server logs can be told apart (rate limit, token limit, empty answer)
    const why = data.error?.message || `finish_reason=${data.choices?.[0]?.finish_reason || "none"}`
    throw new Error(`No JSON in AI response (${why})`)
  }
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
        if (e.busy) return res.status(503).json({ error: BUSY_MESSAGE })
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

// ---------- Resume versions ----------
// A master resume (parentId null) can have versions tailored to individual jobs.

const VERSION_LIMITS = { label: 80, company: 80, role: 80, jobDescription: 8000 }

// Returns { value } with cleaned { label?, target? }, or { error }
function cleanVersionFields(body) {
  const value = {}
  if (body?.label !== undefined) {
    if (typeof body.label !== "string") return { error: "Label must be text" }
    const label = body.label.trim()
    if (label.length > VERSION_LIMITS.label) return { error: `Label must be at most ${VERSION_LIMITS.label} characters` }
    value.label = label
  }
  if (body?.target !== undefined && body.target !== null) {
    if (typeof body.target !== "object") return { error: "Target must be an object" }
    const target = {}
    for (const key of ["company", "role", "jobDescription"]) {
      const raw = body.target[key]
      if (raw === undefined || raw === null) { target[key] = ""; continue }
      if (typeof raw !== "string") return { error: `${key} must be text` }
      if (raw.trim().length > VERSION_LIMITS[key]) {
        return { error: `${key === "jobDescription" ? "Job description" : key[0].toUpperCase() + key.slice(1)} must be at most ${VERSION_LIMITS[key]} characters` }
      }
      target[key] = raw.trim()
    }
    value.target = target
  }
  return { value }
}

async function findOwnedResume(id, userId) {
  if (!mongoose.isValidObjectId(id)) return null
  return Resume.findOne({ _id: id, userId }).catch(() => null)
}

// Copies one design (FR-4 style settings) to every resume and version the user has saved
app.post("/resumes/style", requireAuth, async (req, res) => {
  const style = req.body?.style
  if (!style || typeof style !== "object" || Array.isArray(style) || JSON.stringify(style).length > 4000) {
    return res.status(400).json({ error: "A design is required" })
  }
  try {
    const result = await Resume.updateMany({ userId: req.userId }, { $set: { "data.settings.style": style, updatedAt: new Date() } })
    res.json({ updated: result.modifiedCount })
  } catch (e) {
    res.status(500).json({ error: "Failed to apply the design" })
  }
})

app.post("/resumes/:id/versions", requireAuth, async (req, res) => {
  const { value, error } = cleanVersionFields(req.body)
  if (error) return res.status(400).json({ error })
  if (req.body?.data !== undefined && (typeof req.body.data !== "object" || req.body.data === null)) {
    return res.status(400).json({ error: "Data must be an object" })
  }
  try {
    const source = await findOwnedResume(req.params.id, req.userId)
    if (!source) return res.status(404).json({ error: "Resume not found" })
    // Versions always hang off the master, even when made from another version
    const masterId = source.parentId || source._id.toString()
    const count = await Resume.countDocuments({ userId: req.userId, parentId: masterId })
    const version = await Resume.create({
      userId: req.userId,
      name: source.name,
      data: req.body.data || source.data,
      parentId: masterId,
      label: value.label || `Version ${count + 1}`,
      target: value.target || null
    })
    res.json(version)
  } catch (e) {
    res.status(500).json({ error: "Failed to create version" })
  }
})

app.patch("/resumes/:id", requireAuth, async (req, res) => {
  const { value, error } = cleanVersionFields(req.body)
  if (error) return res.status(400).json({ error })
  if (!Object.keys(value).length) return res.status(400).json({ error: "Nothing to update" })
  try {
    const resume = await findOwnedResume(req.params.id, req.userId)
    if (!resume) return res.status(404).json({ error: "Resume not found" })
    if (value.label === "" && resume.parentId) return res.status(400).json({ error: "A version needs a label" })
    Object.assign(resume, value, { updatedAt: new Date() })
    await resume.save()
    res.json(resume)
  } catch (e) {
    res.status(500).json({ error: "Failed to update resume" })
  }
})

app.post("/resumes/:id/duplicate", requireAuth, async (req, res) => {
  try {
    const source = await findOwnedResume(req.params.id, req.userId)
    if (!source) return res.status(404).json({ error: "Resume not found" })
    const title = source.label || source.name || "resume"
    const copy = await Resume.create({
      userId: req.userId,
      name: source.name,
      data: source.data,
      parentId: source.parentId || null,
      label: `Copy of ${title}`.slice(0, VERSION_LIMITS.label),
      target: source.target || null
    })
    res.json(copy)
  } catch (e) {
    res.status(500).json({ error: "Failed to duplicate resume" })
  }
})

// Rewrites the summary and reorders existing entries for one job. Never adds facts.
const NUMBER_PATTERN = /\d+(?:[.,]\d+)?/g

function isPermutation(order, length) {
  return Array.isArray(order) && order.length === length &&
    new Set(order).size === length && order.every((i) => Number.isInteger(i) && i >= 0 && i < length)
}

// Lowercase words with hyphens and plurals smoothed out, for "does this text mention that term" checks
function normalizeTerms(text) {
  return " " + String(text).toLowerCase().replace(/[-_/]/g, " ").replace(/[^a-z0-9+#. ]+/g, " ")
    .split(/\s+/).filter(Boolean).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)).join(" ") + " "
}

// Short skill-like phrases from a job description, e.g. "sql", "object oriented programming"
function jobTerms(jd) {
  return [...new Set(String(jd).split(/[,.;:\n()]|\band\b|\bor\b|\bwith\b/i)
    .map((t) => t.trim())
    .filter((t) => t && !/\bat\b/i.test(t) && t.split(/\s+/).length <= 4 && t.length > 1)
    .map((t) => normalizeTerms(t))
    .filter((t) => t.trim().length > 1))]
}

app.post("/tailor", requireAuth, async (req, res) => {
  const resume = req.body?.resume
  const jobDescription = typeof req.body?.jobDescription === "string" ? req.body.jobDescription.trim().slice(0, 8000) : ""
  if (!resume || typeof resume !== "object") return res.status(400).json({ error: "Resume is required" })
  if (!jobDescription) return res.status(400).json({ error: "Add a job description to tailor to" })

  const skills = Array.isArray(resume.skillsList) ? resume.skillsList.map(String) : []
  const projects = Array.isArray(resume.projectsList) ? resume.projectsList : []
  const experience = Array.isArray(resume.experienceList) ? resume.experienceList : []
  const facts = JSON.stringify({ summary: resume.summary || "", education: resume.education || "", skills, projects, experience })
  const knownNumbers = new Set(facts.match(NUMBER_PATTERN) || [])

  const prompt = `Tailor this student's resume to the job description, using ONLY facts already in the resume.

Resume facts (JSON): ${facts}

Job description: ${jobDescription}

Rules:
- Rewrite the summary in 30 to 50 words so it leads with the experience and skills most relevant to this job.
- Use only skills, projects, employers, numbers and achievements that already appear in the resume facts. Do not add any new skill, tool, employer, number or achievement, even if the job asks for it.
- Reorder skills, projects and experience by relevance to the job, most relevant first. Return each order as the list of original indexes (0-based), including every index exactly once.

Return ONLY a JSON object:
{"summary":"","skillsOrder":[${skills.map((_, i) => i).join(",")}],"projectsOrder":[${projects.map((_, i) => i).join(",")}],"experienceOrder":[${experience.map((_, i) => i).join(",")}]}`

  // Terms the job asks for that are not on the resume: the summary must not claim them
  const factsNorm = normalizeTerms(facts)
  const missingTerms = jobTerms(jobDescription).filter((t) => !factsNorm.includes(t))
  const jdNorm = normalizeTerms(jobDescription)
  const identity = (list) => list.map((_, i) => i)

  // Skills the job names explicitly go first, keeping the AI's order otherwise
  function skillsFirstForJob(order) {
    const named = order.filter((i) => jdNorm.includes(normalizeTerms(skills[i])))
    return [...named, ...order.filter((i) => !named.includes(i))]
  }

  let feedback = ""
  let lastOrders = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const out = await askGroqForJSON("You tailor resumes without inventing facts. Return only valid JSON.", prompt + feedback, 1500)
      lastOrders = {
        skillsOrder: skillsFirstForJob(isPermutation(out.skillsOrder, skills.length) ? out.skillsOrder : identity(skills)),
        projectsOrder: isPermutation(out.projectsOrder, projects.length) ? out.projectsOrder : identity(projects),
        experienceOrder: isPermutation(out.experienceOrder, experience.length) ? out.experienceOrder : identity(experience)
      }
      const summary = typeof out.summary === "string" ? out.summary.trim().slice(0, 600) : ""
      if (!summary) throw new Error("No summary")
      const inventedNumbers = (summary.match(NUMBER_PATTERN) || []).filter((n) => !knownNumbers.has(n))
      const summaryNorm = normalizeTerms(summary)
      const inventedTerms = missingTerms.filter((t) => summaryNorm.includes(t))
      if (inventedNumbers.length || inventedTerms.length) {
        const bad = [...inventedNumbers, ...inventedTerms]
        feedback = `\n\nYour previous summary mentioned ${bad.join(", ")}, which the resume does not contain. Do not mention them.`
        throw new Error(`Summary added facts: ${bad.join(", ")}`)
      }
      return res.json({ summary, summaryKept: false, ...lastOrders })
    } catch (e) {
      console.error(`Tailoring attempt ${attempt} failed:`, e.message)
      if (e.busy) return res.status(503).json({ error: BUSY_MESSAGE })
    }
  }
  // The AI kept adding facts: keep the user's own summary and apply only the reordering
  if (lastOrders) return res.json({ summary: resume.summary || "", summaryKept: true, ...lastOrders })
  res.status(502).json({ error: "The AI could not tailor this resume right now. Try again in a moment." })
})

// ---------- Content length ----------
// Rewrites the summary and entry descriptions to a length level without adding or dropping facts.
// No login needed: logged-out users can use every setting during their session.

const LENGTH_LEVELS = {
  concise: { label: "Concise", summary: [0, 30], entry: [0, 20], note: "Keep only the key result of each entry." },
  balanced: { label: "Balanced", summary: [30, 50], entry: [20, 40], note: "" },
  detailed: { label: "Detailed", summary: [50, 80], entry: [40, 70], note: "Spell out the tools used and measurable results that are already stated for each entry. Add detail only by explaining what the original text says more fully." }
}

const countWords = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]
// Digits in the text, with small number words ("five years") counted as their digits
const numbersIn = (text) => {
  const spelled = String(text || "").toLowerCase().match(new RegExp(`\\b(${NUMBER_WORDS.join("|")})\\b`, "g")) || []
  return [...(String(text || "").match(NUMBER_PATTERN) || []), ...spelled.map((w) => String(NUMBER_WORDS.indexOf(w)))]
}

// Capitalised or symbol-bearing words (React, Node.js, C++, AWS) that a rewrite must not introduce
function techWords(text) {
  const raw = String(text || "").split(/[\s/,‐-―-]+/).filter(Boolean)
  return raw
    .map((token, i) => {
      const word = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#]+$/g, "")
      const sentenceStart = i === 0 || /[.!?:;]$/.test(raw[i - 1])
      const symbol = /[.+#]/.test(word) || /[A-Z]/.test(word.slice(1))
      return word.length > 1 && (symbol || (!sentenceStart && /^[A-Z]/.test(word))) ? word : null
    })
    .filter(Boolean)
}

// Asks the AI to compare rewrites with their originals; returns { key: "unsupported phrase" }.
// Returns null if the review could not run; callers then treat every rewrite as unchecked.
async function findUnsupportedClaims(pairs, allFacts = "") {
  if (!pairs.length) return {}
  const extra = allFacts
  const prompt = `Compare each rewritten resume line with its original. List any claim in the rewrite that the original does not state or directly imply: an added outcome, benefit, impact, quality, skill, tool, number or responsibility. Rewording, shortening and reordering are fine.${extra ? `
A claim is also supported if these resume facts and details the student gave state it: ${extra}` : ""}

${pairs.map(([f, text]) => `key: ${f.key}
original: ${f.text}
rewrite: ${text}`).join(`

`)}

Return ONLY a JSON object: {"issues":[{"key":"","phrase":"the unsupported words from the rewrite"}]}. Return {"issues":[]} if every rewrite is supported.`
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await askGroqForJSON("You check resume rewrites for invented claims. Be strict but do not flag rewording. Return only valid JSON.", prompt, 3000)
      if (!Array.isArray(out.issues)) throw new Error("No issues list")
      const keys = new Set(pairs.map(([f]) => f.key))
      return Object.fromEntries(out.issues
        .filter((i) => i && keys.has(i.key) && typeof i.phrase === "string" && i.phrase.trim())
        .map((i) => [i.key, i.phrase.trim().slice(0, 120)]))
    } catch (e) {
      console.error(`Claim review attempt ${attempt} failed:`, e.message)
      if (e.busy) throw e
    }
  }
  return null
}

app.post("/resume-length", async (req, res) => {
  const resume = req.body?.resume
  const level = LENGTH_LEVELS[req.body?.level]
  // "rewrite" rewrites every field to the level; "fit" only fixes fields that run over its limits
  const mode = req.body?.mode === "fit" ? "fit" : "rewrite"
  if (!resume || typeof resume !== "object") return res.status(400).json({ error: "Resume is required" })
  if (!level) return res.status(400).json({ error: "Choose Concise, Balanced or Detailed" })

  // Every rewritable field, with its limits and the facts it must keep
  const fields = []
  if (typeof resume.summary === "string" && resume.summary.trim()) {
    fields.push({ key: "summary", title: "Summary", text: resume.summary, limits: level.summary })
  }
  for (const listKey of ["projectsList", "experienceList"]) {
    ;(Array.isArray(resume[listKey]) ? resume[listKey] : []).forEach((entry, i) => {
      if (entry && typeof entry.desc === "string" && entry.desc.trim()) {
        const title = listKey === "projectsList" ? entry.name : [entry.role, entry.company].filter(Boolean).join(" at ")
        fields.push({ key: `${listKey}.${i}`, title: String(title || ""), text: entry.desc, limits: level.entry })
      }
    })
  }
  const todo = mode === "fit" ? fields.filter((f) => countWords(f.text) > f.limits[1]) : fields
  if (!todo.length) return res.json({ resume, kept: [] })

  // What the student typed in the form is also fact, and often has more detail than the generated text
  const source = req.body?.source && typeof req.body.source === "object"
    ? Object.fromEntries(Object.entries(req.body.source).filter(([, v]) => typeof v === "string" && v.trim()).map(([k, v]) => [k, v.slice(0, 2000)]))
    : {}
  const facts = JSON.stringify({
    name: resume.name, education: resume.education, skills: resume.skillsList,
    projects: resume.projectsList, experience: resume.experienceList, summary: resume.summary,
    detailsTheStudentGave: source
  })
  // Every word already on the resume; a capitalised or technical word is fine if it appears here
  const factsVocab = new Set(facts.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean)
    .flatMap((w) => [w.replace(/\.+$/, ""), ...w.split(".")]).filter(Boolean))
  // Common abbreviations count as the same fact both ways
  if (factsVocab.has("cs")) ["computer", "science"].forEach((w) => factsVocab.add(w))
  if (factsVocab.has("computer") && factsVocab.has("science")) factsVocab.add("cs")

  // Problems with one rewritten field, or [] when it is acceptable
  function problems(field, text) {
    const out = []
    const words = countWords(text)
    if (!text.trim()) out.push("it is empty")
    if (words > field.limits[1]) out.push(`it has ${words} words; the maximum is ${field.limits[1]}`)
    const before = numbersIn(field.text)
    const after = numbersIn(text)
    const lost = before.filter((n) => !after.includes(n))
    const added = after.filter((n) => !numbersIn(facts).includes(n))
    if (lost.length) out.push(`it drops the number(s) ${lost.join(", ")}, which must stay`)
    if (added.length) out.push(`it adds the number(s) ${added.join(", ")}, which are not on the resume`)
    const known = (w) => {
      const lower = w.toLowerCase().replace(/\.+$/, "")
      return factsVocab.has(lower) || factsVocab.has(lower.replace(/s$/, "")) || factsVocab.has(`${lower}s`)
    }
    const newTech = [...new Set(techWords(text).filter((w) => !known(w)))]
    if (newTech.length) out.push(`it mentions ${newTech.join(", ")}, which are not on the resume`)
    return out
  }

  const results = {}
  let pending = todo
  let feedback = ""
  // Shortening gets a third attempt (only failing lines are resent); expanding stops at two
  const attempts = level.label === "Detailed" ? 2 : 3
  for (let attempt = 1; attempt <= attempts && pending.length; attempt++) {
    const prompt = `Rewrite these parts of a student's resume to the "${level.label}" length.

Limits:
- Summary: ${level.summary[0] ? `${level.summary[0]} to ` : "at most "}${level.summary[1]} words.
- Each project or experience description: ${level.entry[0] ? `${level.entry[0]} to ` : "at most "}${level.entry[1]} words.
${level.note}

Strict rules:
- Keep every name, number, skill and fact that is in the original text. Never drop a number.
- Never add a skill, tool, number, employer or achievement that is not in the resume facts below.
- Never add outcomes, impact or benefits that are not stated, such as "improved outcomes", "enhanced quality" or "guided strategy".
- If there is not enough to reach the minimum, stay shorter, or return the original text unchanged. Never pad.
- Write in resume style: start project and experience lines with a past-tense verb (Built, Analysed, Cut), no "I" or "my", no repeating the title.
- Spell numbers as digits, exactly as in the original.
- Never go over the maximum word count.

Resume facts (for reference only): ${facts}

Rewrite each of these (key, title, original text):
${pending.map((f) => `- ${f.key} | ${f.title} | ${f.text}`).join("\n")}${feedback}

Return ONLY a JSON object: {"rewrites":[{"key":"","text":""}]}`

    try {
      const out = await askGroqForJSON("You shorten or expand resume text without inventing or losing facts. Return only valid JSON.", prompt, 4000)
      const byKey = Object.fromEntries((Array.isArray(out.rewrites) ? out.rewrites : [])
        .filter((r) => r && typeof r.key === "string" && typeof r.text === "string")
        .map((r) => [r.key, r.text.trim()]))
      const failed = []
      const notes = []
      const candidates = []
      for (const f of pending) {
        const text = byKey[f.key]
        const issues = text === undefined ? ["it was missing from your answer"] : problems(f, text)
        if (issues.length) { failed.push(f); notes.push(`- ${f.key}: ${issues.join("; ")}`) }
        else candidates.push([f, text])
      }
      // Rewrites that grow can add claims, so they get a second AI check; one that cannot be checked is not accepted
      const growing = candidates.filter(([f, text]) => countWords(text) > countWords(f.text))
      const unsupported = growing.length
        ? (await findUnsupportedClaims(growing, facts)) || Object.fromEntries(growing.map(([f]) => [f.key, "(could not be checked)"]))
        : {}
      for (const [f, text] of candidates) {
        if (unsupported[f.key]) {
          failed.push(f)
          notes.push(`- ${f.key}: it claims "${unsupported[f.key]}", which the original does not say`)
        } else results[f.key] = text
      }
      pending = failed
      feedback = failed.length ? `\n\nYour previous answer had problems. Fix them:\n${notes.join("\n")}` : ""
      if (failed.length) console.error(`Length rewrite attempt ${attempt}:`, notes.join(" "))
    } catch (e) {
      console.error(`Length rewrite attempt ${attempt} failed:`, e.message)
      if (e.busy) return res.status(503).json({ error: BUSY_MESSAGE })
    }
  }

  // Apply the accepted rewrites; anything still failing keeps its original text
  const next = {
    ...resume,
    projectsList: Array.isArray(resume.projectsList) ? resume.projectsList.map((p) => ({ ...p })) : resume.projectsList,
    experienceList: Array.isArray(resume.experienceList) ? resume.experienceList.map((e) => ({ ...e })) : resume.experienceList
  }
  for (const [key, text] of Object.entries(results)) {
    if (key === "summary") next.summary = text
    else {
      const [listKey, i] = key.split(".")
      next[listKey][Number(i)].desc = text
    }
  }
  res.json({ resume: next, kept: pending.map((f) => f.title || f.key) })
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
        parentId: r.parentId || null,
        label: r.label || "",
        target: r.target || null,
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