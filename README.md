# ResumeAI

An AI-powered resume builder that generates, scores, and optimizes resumes for job applications.

Built as a final year B.Tech project at Shambhunath Institute of Engineering Technology, Prayagraj.

---

## Features

- **AI Resume Generation** — Generate professional resumes from basic input using Groq's Llama 3.1 model
- **ATS Score Analysis** — Paste any job description and get a match score with found and missing keywords
- **AI Suggestions** — Get specific, actionable improvements for your resume based on target roles
- **Inline Editing** — Click any section of the generated resume to edit it directly
- **PDF Export** — Download your resume as a clean PDF file
- **Save & Manage Resumes** — Store multiple resume versions in MongoDB, load them anytime, update or duplicate as needed
- **Dark / Light Theme** — Toggle with a smooth circular reveal animation
- **Feedback System** — Built-in feedback form storing user feedback in the database
- **Mobile Responsive** — Works on phones and desktop

---

## Tech Stack

**Frontend**
- React 18 (Vite)
- Tailwind CSS
- Lucide React (icons)
- jsPDF (PDF generation)

**Backend**
- Node.js
- Express
- Mongoose

**Database**
- MongoDB Atlas

**AI**
- Groq API (Llama 3.1 8B Instant)

---

## Folder Structure

```
resume-ai/
├── resume-builder/          Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx          Main application
│   │   ├── components/
│   │   │   ├── ResumeForm.jsx
│   │   │   ├── ResumePreview.jsx
│   │   │   ├── ATSScorer.jsx
│   │   │   ├── Suggestions.jsx
│   │   │   └── Footer.jsx
│   │   └── index.css
│   └── package.json
│
└── resume-backend/          Backend (Node + Express)
    ├── server.js            Express server with all routes
    ├── .env                 Environment variables (not committed)
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- A MongoDB Atlas account (free tier works)
- A Groq API key (free at console.groq.com)

### Backend Setup

1. Navigate to the backend folder:

```bash
cd resume-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your credentials:

```
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
PORT=5000
```

4. Start the backend:

```bash
node server.js
```

You should see "Server running on port 5000" and "MongoDB connected".

### Frontend Setup

1. Open a new terminal and navigate to the frontend folder:

```bash
cd resume-builder
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open the localhost URL shown in your browser.

---

## API Endpoints

| Method | Endpoint            | Description                               |
| ------ | ------------------- | ----------------------------------------- |
| GET    | `/`                 | Health check                              |
| GET    | `/resumes`          | Fetch all saved resumes                   |
| POST   | `/resumes`          | Save a new resume                         |
| PUT    | `/resumes/:id`      | Update an existing resume                 |
| DELETE | `/resumes/:id`      | Delete a resume                           |
| POST   | `/api/generate`     | Proxy endpoint for Groq AI calls          |
| POST   | `/feedback`         | Submit feedback                           |

---

## How It Works

1. The user fills in basic details (name, skills, projects, experience) in the Build tab.
2. On clicking Generate, the frontend sends a structured prompt to the backend.
3. The backend forwards the prompt to Groq's API with the API key (never exposed to the browser).
4. Groq returns a structured JSON resume which gets rendered in the preview panel.
5. Users can paste a job description in the ATS Score tab to see how their resume matches.
6. The Suggestions tab provides AI-generated improvements for specific roles.
7. Resumes can be saved to MongoDB and loaded back into the editor anytime.

---

## Team

- **Vineet Vikram Singh**
- **Virat Shukla**
- **Vishal Kashyap**

Shambhunath Institute of Engineering Technology, Prayagraj

---

## Contact

- Email — smashvineer@gmail.com
- GitHub — [vineetvsingh](https://github.com/vineetvsingh)
- LinkedIn — [vineetvsingh](https://www.linkedin.com/in/vineetvsingh)

---

## License

This project is built for academic purposes as part of a B.Tech final year submission.
