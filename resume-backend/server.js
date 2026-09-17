const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err))

const resumeSchema = new mongoose.Schema({
  userId: { type: String, default: "guest" },
  name: String,
  data: Object,
  createdAt: { type: Date, default: Date.now }
})

const Resume = mongoose.model("Resume", resumeSchema)

app.get("/", (req, res) => res.send("Resume API running"))

app.get("/resumes", async (req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 })
    res.json(resumes)
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch resumes" })
  }
})

app.post("/resumes", async (req, res) => {
  const { name, data } = req.body
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required and must be a string" })
  }
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Data is required and must be an object" })
  }
  try {
    const resume = new Resume({ name: name.trim(), data })
    await resume.save()
    res.json(resume)
  } catch (e) {
    res.status(500).json({ error: "Failed to save resume" })
  }
})

app.delete("/resumes/:id", async (req, res) => {
  try {
    await Resume.findByIdAndDelete(req.params.id)
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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000
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

app.put("/resumes/:id", async (req, res) => {
  const { name, data } = req.body
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required and must be a string" })
  }
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Data is required and must be an object" })
  }
  try {
    const updated = await Resume.findByIdAndUpdate(
      req.params.id,
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