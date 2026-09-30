# ResumeAI: Project Overview

A plain-language guide to what ResumeAI does, how it works, and what makes it different from other resume websites.

**Live site:** [resume-ai-xi-fawn.vercel.app](https://resume-ai-xi-fawn.vercel.app)
**Team:** Vineet Vikram Singh, Virat Shukla, Vishal Kashyap
**College:** Shambhunath Institute of Engineering Technology, Prayagraj (B.Tech final year project)

---

## 1. What is ResumeAI?

ResumeAI is a website that helps computer science students in India build a resume, check it against real job descriptions, and improve it.

You type in your details, and the AI writes a clean one-page resume. You then paste a job description, and ResumeAI tells you how well your resume matches it and which keywords are missing.

Most tools stop there. ResumeAI goes one step further: for every missing skill, it gives you a short learning plan and a small project to build. Once you finish, it adds that skill to your resume. You end up with a resume that matches the job **and is true**.

## 2. Who is it for?

- Final-year and pre-final-year CS students preparing for campus placements and internships
- Students who don't know what recruiters look for, or which skills they are missing
- Anyone who wants a free, simple resume tool without paid plans or watermarks

---

## 3. What can you do on ResumeAI?

### Without an account

| Feature | What it does |
| --- | --- |
| **Build a resume** | Fill in your name, college, CGPA, skills, projects and experience. The AI writes a professional one-page resume. |
| **Edit on the page** | Click any line of the resume to change it. Add or remove skills, projects and experience. |
| **Download PDF** | Save your resume as a PDF file. |
| **ATS score** | Paste a job description. You get a match score (0–100%), the keywords you already have (highlighted in yellow) and the ones you're missing (underlined in red). |
| **Suggestions** | Describe the role you want. The AI suggests specific rewrites for weak lines, shown like a teacher's red-pen corrections. |
| **Light and dark mode** | Switch themes with the sun/moon button. |

### With a free account

| Feature | What it does |
| --- | --- |
| **Private saved resumes** | Save as many resume versions as you like. Only you can see them. |
| **Personal dashboard** | Your homepage after logging in. It shows your resumes as page previews, your ATS score history as a chart, the keywords you keep missing, and your recent checks. |
| **Get set up checklist** | New accounts see three steps to get started: complete your profile, save a resume, run an ATS check. |
| **Profile settings** | Store your phone, city, college, CGPA, graduation year, target role and links (LinkedIn, GitHub, portfolio). New resumes fill in these details for you. |
| **Skill Gap Roadmap** | Our unique feature. See section 4. |
| **Side panel** | A menu that opens from the left, for quick access to every page and your saved resumes. |

### Works on phones

The whole site is tested on phone screens (360px to 412px wide). Buttons are large enough to tap, text fields don't cause iPhones to zoom in, and after you generate or open a resume the page scrolls to it automatically.

---

## 4. What makes ResumeAI different

### The problem with existing resume tools

There are many good resume tools already. Broadly they fall into three groups:

- **Resume builders** (for example Rezi, Kickresume, Zety) help you write and format a resume, often with AI.
- **ATS checkers** (for example Jobscan, Resume Worded) score your resume against a job description and list missing keywords.
- **Job trackers** (for example Teal) help you organise applications.

They share one weakness. When a job asks for a skill you don't have, they tell you to **add the keyword to your resume**. That encourages students to list skills they can't back up, which falls apart in the first technical interview.

### Our answer: the Skill Gap Roadmap

ResumeAI treats a missing keyword as a skill to learn, not just a word to paste in.

1. **Spot the gap.** After you run ATS checks, ResumeAI notices the keywords missing from more than one job (for example "Docker: missing in 2 of 5 jobs").
2. **Get a plan.** Tap **Learn it** and the AI makes a personal 2–3 week plan for about 1 hour a day. The plan:
   - builds on skills already on your resume (if you know Python, it teaches Docker using a Python app)
   - is aimed at your target role from your profile
   - uses only free resources, such as official docs, freeCodeCamp and NPTEL
3. **Build a small project.** Every plan ends with one small project that genuinely uses the skill, with step-by-step instructions.
4. **Track your progress.** Tick off each task as you go. Progress is saved to your account and shown on your dashboard under "Skills you're learning".
5. **Add it honestly.** The **Add to my resume** button only unlocks once every step is done. It then adds the skill and a ready-written line about your project to your resume.

In short: **other tools help you look qualified; ResumeAI helps you become qualified, then shows it.**

### Other differences

| | Typical resume or ATS tools | ResumeAI |
| --- | --- | --- |
| Missing keywords | "Add this keyword" | A plan to learn it, a project to prove it, then add it |
| Keyword analysis | One job at a time | Also finds skills missing across **several** jobs you checked |
| Audience | General, often US-focused | Built for Indian CS students: CGPA, campus roles, free Indian resources like NPTEL |
| Cost | Key features often behind a paid plan | Free |
| Progress over time | Rarely shown | Score history chart, best and latest score, skills in progress |

These comparisons describe how such tools typically work. Features change often, so check a specific tool's current version before quoting it in a presentation.

---

## 5. How it works (simple version)

```
  Your browser  ──────▶  Our backend server  ──────▶  Groq AI (writes and checks resumes)
  (React website)        (Node.js + Express)
                                 │
                                 ▼
                          MongoDB database
                  (accounts, resumes, scores, plans)
```

1. You use the website in your browser. It is built with **React**.
2. When you ask for something (generate a resume, score it, make a plan), the website sends a request to our **backend server**.
3. For AI tasks, the backend sends a carefully written prompt to **Groq**, which runs the `gpt-oss-20b` AI model. The AI key stays on the server and is never sent to the browser.
4. Anything saved (accounts, resumes, ATS scores, learning plans) goes into a **MongoDB** database.

### Keeping accounts safe

- **Passwords are never stored as plain text.** They are hashed with **bcrypt**.
- **Logging in gives your browser a token (JWT)** that proves who you are for 7 days.
- **Every saved item is tied to your account.** The server checks ownership on every request, so nobody else can see, edit or delete your resumes, scores or plans.
- **The AI's answers are checked before use.** The server validates each plan's structure and retries once if the AI returns something incomplete.

---

## 6. Tech stack

| Part | Technology |
| --- | --- |
| Website | React (Vite), plain CSS with light/dark themes, Lucide icons |
| PDF export | jsPDF |
| Server | Node.js, Express |
| Database | MongoDB Atlas (with Mongoose) |
| AI | Groq API, `openai/gpt-oss-20b` model |
| Login | bcrypt (password hashing), JSON Web Tokens |
| Hosting | Vercel (website), Render (server) |

---

## 7. Server API

| Method | Endpoint | Login needed | What it does |
| --- | --- | --- | --- |
| POST | `/auth/signup` | No | Create an account (name, email, password) |
| POST | `/auth/login` | No | Log in and get a token |
| GET | `/auth/me` | Yes | Get the logged-in user |
| PUT | `/profile` | Yes | Update profile details |
| GET / POST | `/resumes` | Yes | List or save your resumes |
| PUT / DELETE | `/resumes/:id` | Yes | Update or delete one of your resumes |
| POST | `/scores` | Yes | Record an ATS check |
| GET | `/dashboard` | Yes | Everything the dashboard shows |
| POST | `/roadmaps` | Yes | Get (or create) a learning plan for a keyword |
| GET / PATCH / DELETE | `/roadmaps/:id` | Yes | Read, update progress on, or delete a plan |
| POST | `/api/generate` | No | Send a prompt to the AI (used by Build, ATS Score and Suggestions) |
| POST | `/feedback` | No | Send feedback from the footer form |

---

## 8. A 5-minute demo

1. **Home page.** Show the logged-out homepage and its three steps: Build, Check, Improve.
2. **Build.** Click **Start building**, fill in a few details, click **Generate resume**. Click a line on the resume to edit it.
3. **ATS check.** Open the **ATS Score** tab, paste a real job description from a placement drive, and show the score with found and missing keywords.
4. **Account and dashboard.** Create an account and save the resume. Show the dashboard: resume previews, score chart, keywords to add.
5. **Skill Gap Roadmap (the unique part).** Click **Learn it** on a missing keyword. Walk through the weekly plan, the project and the free resources. Tick a few steps, go back to the dashboard and show the progress bar.
6. **Close the loop.** Open a finished plan and click **Add to my resume**. The skill and a project line appear on the resume.
7. **Mobile.** Open the site on a phone to show it works there too.

---

## 9. Known limitations and future work

- **Links aren't on the resume yet.** LinkedIn, GitHub and portfolio links from your profile are saved but don't appear on the resume or PDF.
- **The PDF has its own layout.** It's a clean standard layout that doesn't exactly match the on-screen page.
- **The AI can make mistakes.** Scores, suggestions and plans are generated by an AI model, so treat them as guidance, not fact.
- **Plans rely on honesty.** ResumeAI trusts you to tick a step only when it's done. A future version could check the project's GitHub repository.
- **The AI endpoint has no rate limit.** `/api/generate` works without logging in, so anyone could use up the AI quota. A rate limit or login requirement should be added before wider use.

Ideas for later: importing details from a LinkedIn PDF export, a cover letter generator, and interview practice questions based on your resume.
