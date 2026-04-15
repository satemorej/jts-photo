// Génération rapport PDF via jsPDF
import { jsPDF } from 'jspdf'
import type { Session } from './db'

export async function generateSessionReport(session: Session): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 15

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('JTS Agencement — Rapport chantier', W / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Chantier : ${session.chantierName}`, 15, y)
  y += 6
  doc.text(`Date : ${new Date(session.createdAt).toLocaleDateString('fr-FR')}`, 15, y)
  y += 6
  doc.text(`Photos : ${session.photos.length}`, 15, y)
  y += 10

  doc.setDrawColor(200)
  doc.line(15, y, W - 15, y)
  y += 8

  for (let i = 0; i < session.photos.length; i++) {
    const photo = session.photos[i]

    if (y > 250) {
      doc.addPage()
      y = 15
    }

    // Thumbnail
    try {
      const imgProps = doc.getImageProperties(photo.thumbnail)
      const maxW = 60
      const maxH = 45
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height)
      const w = imgProps.width * ratio
      const h = imgProps.height * ratio
      doc.addImage(photo.thumbnail, 'JPEG', 15, y, w, h)
    } catch {
      // thumbnail may fail — continue
    }

    // Info
    const infoX = 80
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Photo ${i + 1}`, infoX, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(new Date(photo.createdAt).toLocaleString('fr-FR'), infoX, y + 9)

    let ny = y + 14
    if (photo.notes.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Notes :', infoX, ny)
      ny += 4
      doc.setFont('helvetica', 'normal')
      for (const note of photo.notes) {
        const lines = doc.splitTextToSize(`• ${note.text}`, W - infoX - 15)
        doc.text(lines, infoX, ny)
        ny += lines.length * 4
      }
    }

    y = Math.max(y + 50, ny) + 6
    doc.setDrawColor(230)
    doc.line(15, y, W - 15, y)
    y += 6
  }

  const filename = `rapport_${session.chantierName}_${new Date(session.createdAt).toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}

export async function generateSessionReportBlob(session: Session): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 15

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('JTS Agencement — Rapport chantier', W / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Chantier : ${session.chantierName}`, 15, y); y += 6
  doc.text(`Date : ${new Date(session.createdAt).toLocaleDateString('fr-FR')}`, 15, y); y += 6
  doc.text(`Photos : ${session.photos.length}`, 15, y); y += 10

  doc.setDrawColor(200)
  doc.line(15, y, W - 15, y); y += 8

  for (let i = 0; i < session.photos.length; i++) {
    const photo = session.photos[i]
    if (y > 250) { doc.addPage(); y = 15 }

    try {
      const imgProps = doc.getImageProperties(photo.thumbnail)
      const maxW = 60, maxH = 45
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height)
      doc.addImage(photo.thumbnail, 'JPEG', 15, y, imgProps.width * ratio, imgProps.height * ratio)
    } catch { /* continue */ }

    const infoX = 80
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(`Photo ${i + 1}`, infoX, y + 4)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(new Date(photo.createdAt).toLocaleString('fr-FR'), infoX, y + 9)

    let ny = y + 14
    if (photo.notes.length > 0) {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('Notes :', infoX, ny); ny += 4
      doc.setFont('helvetica', 'normal')
      for (const note of photo.notes) {
        const lines = doc.splitTextToSize(`• ${note.text}`, W - infoX - 15)
        doc.text(lines, infoX, ny); ny += lines.length * 4
      }
    }
    y = Math.max(y + 50, ny) + 6
    doc.setDrawColor(230); doc.line(15, y, W - 15, y); y += 6
  }

  return doc.output('blob')
}
