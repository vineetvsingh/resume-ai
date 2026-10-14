// Reads an uploaded resume (PDF, Word or plain text) in the browser and checks how well ATS software can read it.
// The file never leaves the device; only its text is sent for the job match.

export const MAX_FILE_MB = 5
export const ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"

function kindOf(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf"
  if (name.endsWith(".docx")) return "docx"
  if (name.endsWith(".txt") || file.type === "text/plain") return "txt"
  if (name.endsWith(".doc")) return "doc"
  return null
}

async function readPdf(file) {
  // Loaded only when someone uploads a PDF, so the app itself stays small
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const { default: workerSrc } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  try {
    const doc = await task.promise
    const pages = []
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent()
      pages.push(content.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join(""))
    }
    return { text: pages.join("\n"), pages: doc.numPages, tables: 0, images: 0 }
  } finally {
    // Frees the PDF worker, whether reading worked or not
    task.destroy()
  }
}

async function readDocx(file) {
  const mammoth = (await import("mammoth")).default
  const arrayBuffer = await file.arrayBuffer()
  const [{ value: text }, { value: html }] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer })
  ])
  return {
    text,
    pages: null,
    tables: (html.match(/<table/g) || []).length,
    images: (html.match(/<img/g) || []).length
  }
}

// Returns { name, kind, text, words, pages, tables, images }, or throws an Error with a message for the user
export async function readResumeFile(file) {
  const kind = kindOf(file)
  if (kind === "doc") throw new Error("Old .doc files can't be read. Save it as .docx or PDF and upload that.")
  if (!kind) throw new Error("Upload a PDF, Word (.docx) or text file.")
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`That file is over ${MAX_FILE_MB} MB. Upload a smaller copy.`)

  let out
  try {
    out = kind === "pdf" ? await readPdf(file)
      : kind === "docx" ? await readDocx(file)
      : { text: await file.text(), pages: null, tables: 0, images: 0 }
  } catch (e) {
    console.error("Reading the uploaded resume failed:", e)
    if (e?.name === "PasswordException") throw new Error("This PDF is password-protected. Remove the password and upload it again.", { cause: e })
    throw new Error("Could not read this file. It may be damaged. Try exporting it again as PDF.", { cause: e })
  }

  const text = out.text.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim()
  const words = text ? text.split(/\s+/).length : 0
  return { name: file.name, kind, ...out, text, words }
}

const SECTIONS = [
  { id: "education", label: "Education", pattern: /\b(education|academic|qualifications?)\b/i, required: true },
  { id: "skills", label: "Skills", pattern: /\b(skills|technical skills|technologies|tech stack)\b/i, required: true },
  { id: "experience", label: "Experience or projects", pattern: /\b(experience|employment|internships?|work history|projects?)\b/i, required: true },
  { id: "summary", label: "Summary", pattern: /\b(summary|objective|profile|about me)\b/i, required: false }
]

// Checks that don't need the AI: can the text be read, is the contact info there, are the usual sections named plainly
// Each check: { id, status: "pass" | "warn" | "fail", title, detail }
export function readabilityChecks(parsed) {
  const { text, words, pages, kind, tables, images } = parsed
  const checks = []

  if (words < 40) {
    checks.push({
      id: "text", status: "fail", title: "Almost no text could be read",
      detail: kind === "pdf"
        ? "This PDF looks like a scanned image or picture. ATS software would see a blank page. Export it from Word or Google Docs as a text PDF."
        : "The file is nearly empty."
    })
    return checks
  }
  checks.push({ id: "text", status: "pass", title: "Text can be read", detail: `${words} words found, so ATS software can read it.` })

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  checks.push(email
    ? { id: "email", status: "pass", title: "Email found", detail: email[0] }
    : { id: "email", status: "fail", title: "No email address found", detail: "Put your email as plain text near the top, not inside an image or icon." })

  const phone = text.match(/(\+?\d[\d\s().-]{8,}\d)/)
  checks.push(phone && phone[0].replace(/\D/g, "").length >= 10
    ? { id: "phone", status: "pass", title: "Phone number found", detail: phone[0].trim() }
    : { id: "phone", status: "warn", title: "No phone number found", detail: "Recruiters expect a phone number in the header." })

  const missing = SECTIONS.filter((s) => s.required && !s.pattern.test(text))
  checks.push(missing.length
    ? {
        id: "sections", status: "warn", title: `Missing ${missing.map((s) => s.label).join(", ")}`,
        detail: "ATS software looks for standard headings. Use plain names like Education, Skills, Experience and Projects."
      }
    : { id: "sections", status: "pass", title: "Standard section headings", detail: "Education, Skills and Experience or Projects were all found." })

  if (pages) {
    checks.push(pages <= 2
      ? { id: "length", status: "pass", title: `${pages} ${pages === 1 ? "page" : "pages"}`, detail: pages === 1 ? "Ideal for students and freshers." : "Fine if you have real experience; one page is safer for freshers." }
      : { id: "length", status: "warn", title: `${pages} pages`, detail: "Keep it to one page, two at most. Recruiters skim." })
  } else if (words > 900) {
    checks.push({ id: "length", status: "warn", title: "Long resume", detail: `${words} words is likely over two pages. Aim for 350–700.` })
  }

  if (tables) {
    checks.push({ id: "tables", status: "warn", title: `${tables} ${tables === 1 ? "table" : "tables"} found`, detail: "Some ATS software reads tables out of order. Plain lines are safer." })
  }
  if (images) {
    checks.push({ id: "images", status: "warn", title: `${images} ${images === 1 ? "image" : "images"} found`, detail: "ATS software ignores images. Make sure no information is only inside a picture or icon." })
  }

  return checks
}
