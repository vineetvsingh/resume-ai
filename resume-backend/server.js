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
  createdAt: { type: Date, default: Date.now }
})

const Resume = mongoose.model("Resume", resumeSchema)

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
      { name: name.trim(), data },
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))