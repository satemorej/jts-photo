import { jsPDF } from 'jspdf'
import type { Session, SessionLocation } from './db'
import { saveSession } from './db'

const IMG_W = 60
const IMG_H = 45
const LEFT  = 15
const INFO_X = 82
const PAGE_H = 287

async function resolveAddress(location: SessionLocation): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lng}&format=json`,
      { headers: { 'Accept-Language': 'fr', 'User-Agent': 'JTSPhoto/1.0' } }
    )
    if (!res.ok) return null
    const { address: a } = await res.json()
    if (!a) return null

    const line1 = [a.house_number, a.road ?? a.hamlet ?? a.neighbourhood ?? a.suburb].filter(Boolean).join(' ')
    const city  = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? ''
    const line2 = [a.postcode, city.toUpperCase()].filter(Boolean).join(' ')
    const line3 = a.country ?? ''

    return [line1, line2, line3].filter(Boolean).join('\n')
  } catch {
    return null
  }
}

async function buildDoc(session: Session): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 15

  const photoCount = session.photos.filter(p => p.mediaType !== 'video').length
  const videoCount = session.photos.filter(p => p.mediaType === 'video').length

  // ── En-tête ──────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('JTS Agencement — Rapport chantier', W / 2, y, { align: 'center' })
  y += 8

  // Reverse geocoding si coords présentes mais adresse manquante
  if (session.location && !session.location.address) {
    const address = await resolveAddress(session.location)
    if (address) {
      session.location.address = address
      saveSession(session).catch(() => {})
    }
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Chantier : ${session.chantierName}`, LEFT, y); y += 6
  doc.text(`Date : ${new Date(session.createdAt).toLocaleDateString('fr-FR')}`, LEFT, y); y += 6

  if (session.location) {
    const { lat, lng, address } = session.location
    const coordStr = `GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)}`
    doc.text(coordStr, LEFT, y); y += 6
    if (address) {
      const addrLines = address.split('\n')
      doc.text(addrLines, LEFT, y)
      y += addrLines.length * 5
    }
  }

  const summary = [
    photoCount ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : '',
    videoCount ? `${videoCount} vidéo${videoCount > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(', ')
  doc.text(`Médias : ${summary || '0'}`, LEFT, y); y += 10

  doc.setDrawColor(200)
  doc.line(LEFT, y, W - LEFT, y); y += 8

  // ── Médias ───────────────────────────────────────────────────
  let photoIdx = 0
  let videoIdx = 0

  for (const photo of session.photos) {
    const isVideo = photo.mediaType === 'video'
    const rowH = Math.max(IMG_H, 14 + photo.notes.length * 16) + 10

    if (y + rowH > PAGE_H) { doc.addPage(); y = 15 }

    if (isVideo) {
      // Placeholder vidéo : rectangle gris + texte
      doc.setFillColor(45, 45, 45)
      doc.rect(LEFT, y, IMG_W, IMG_H, 'F')
      doc.setFillColor(80, 80, 80)
      doc.rect(LEFT + IMG_W / 2 - 12, y + IMG_H / 2 - 8, 24, 16, 'F')
      // Icône play simplifiée (triangle)
      doc.setFillColor(200, 200, 200)
      doc.triangle(
        LEFT + IMG_W / 2 - 4, y + IMG_H / 2 - 5,
        LEFT + IMG_W / 2 - 4, y + IMG_H / 2 + 5,
        LEFT + IMG_W / 2 + 6, y + IMG_H / 2,
        'F'
      )
      videoIdx++
      doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`Vidéo ${videoIdx}`, INFO_X, y + 5)
    } else {
      // Thumbnail photo
      try {
        const imgProps = doc.getImageProperties(photo.thumbnail)
        const ratio = Math.min(IMG_W / imgProps.width, IMG_H / imgProps.height)
        doc.addImage(photo.thumbnail, 'JPEG', LEFT, y, imgProps.width * ratio, imgProps.height * ratio)
      } catch { /* thumbnail absente — espace vide */ }
      photoIdx++
      doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text(`Photo ${photoIdx}`, INFO_X, y + 5)
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(new Date(photo.createdAt).toLocaleString('fr-FR'), INFO_X, y + 10)

    let ny = y + 15
    if (photo.notes.length > 0) {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('Notes :', INFO_X, ny); ny += 4
      doc.setFont('helvetica', 'normal')
      for (const note of photo.notes) {
        const lines = doc.splitTextToSize(`• ${note.text}`, W - INFO_X - LEFT)
        doc.text(lines, INFO_X, ny)
        ny += lines.length * 4 + 1
      }
    }

    y = Math.max(y + IMG_H + 4, ny) + 4
    doc.setDrawColor(230); doc.line(LEFT, y, W - LEFT, y); y += 6
  }

  return doc
}

export async function generateSessionReport(session: Session): Promise<void> {
  const doc = await buildDoc(session)
  const filename = `rapport_${session.chantierName}_${new Date(session.createdAt).toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}

export async function generateSessionReportBlob(session: Session): Promise<Blob> {
  const doc = await buildDoc(session)
  return doc.output('blob')
}
