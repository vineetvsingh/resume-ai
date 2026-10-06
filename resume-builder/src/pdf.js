import jsPDF from "jspdf"
import { getSectionOrder } from "./resumeLayout"

// Draws the resume as a text-based PDF (so ATS software can read it). Used for download and page counting.
export function buildResumePdf(resume) {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = 210
  const pageHeight = 297
  const margin = 20
  const bottomMargin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 20

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - bottomMargin) {
      pdf.addPage()
      y = 20
    }
  }

  const addSectionHeader = (title) => {
    checkPageBreak(12)
    y += 4
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.setFont("helvetica", "bold")
    pdf.text(title.toUpperCase(), margin, y)
    y += 2
    pdf.setDrawColor(220, 220, 220)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 5
  }

  pdf.setFontSize(22)
  pdf.setTextColor(17, 17, 17)
  pdf.setFont("helvetica", "bold")
  pdf.text(resume.name || "", margin, y)
  y += 7

  pdf.setFontSize(9)
  pdf.setTextColor(100, 100, 100)
  pdf.setFont("helvetica", "normal")
  const contact = [resume.email, resume.phone].filter(Boolean).join("  ·  ")
  pdf.text(contact, margin, y)
  y += 8

  const drawEntries = (title, entries, heading) => {
    if (!entries?.length) return
    addSectionHeader(title)
    entries.forEach((entry) => {
      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      const descLines = pdf.splitTextToSize(entry.desc || "", contentWidth - 6)
      checkPageBreak(5 + descLines.length * 5 + 2)
      pdf.setTextColor(17, 17, 17)
      pdf.setFont("helvetica", "bold")
      pdf.text(`• ${heading(entry)}`, margin, y)
      y += 5
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(80, 80, 80)
      pdf.text(descLines, margin + 3, y)
      y += descLines.length * 5 + 2
    })
  }

  const drawSection = {
    summary: () => {
      if (!resume.summary) return
      addSectionHeader("Summary")
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      pdf.setFont("helvetica", "normal")
      const summaryLines = pdf.splitTextToSize(resume.summary, contentWidth)
      pdf.text(summaryLines, margin, y)
      y += summaryLines.length * 5 + 2
    },
    education: () => {
      addSectionHeader("Education")
      pdf.setFontSize(10)
      pdf.setTextColor(30, 30, 30)
      pdf.setFont("helvetica", "normal")
      pdf.text(resume.education || "", margin, y)
      y += 8
    },
    skills: () => {
      if (!resume.skillsList?.length) return
      addSectionHeader("Skills")
      pdf.setFontSize(10)
      pdf.setTextColor(30, 30, 30)
      pdf.setFont("helvetica", "normal")
      const skillLines = pdf.splitTextToSize(resume.skillsList.join("  ·  "), contentWidth)
      pdf.text(skillLines, margin, y)
      y += skillLines.length * 5 + 2
    },
    projects: () => drawEntries("Projects", resume.projectsList, (p) => p.name || ""),
    experience: () => drawEntries("Experience", resume.experienceList, (e) => `${e.role || ""} at ${e.company || ""}`)
  }

  getSectionOrder(resume).forEach((id) => drawSection[id]())

  return pdf
}
