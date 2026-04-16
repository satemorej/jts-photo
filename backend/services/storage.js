import path from 'node:path'
import crypto from 'node:crypto'
import { writeFile } from '../gateway/gatewayClient.js'

const BASE_DIR = process.env.PHOTOS_DIR ?? '/volume1/photo/photos-jts'

function sanitize(str) {
  return String(str).replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 60)
}

function buildBaseName(chantierName, timestamp) {
  const date    = new Date(Number(timestamp))
  const dateStr = date.toISOString().slice(0, 10)
  const timeStr = date.toISOString().slice(11, 19).replace(/:/g, '-')
  const suffix  = crypto.randomBytes(3).toString('hex')
  return `${sanitize(chantierName)}_${dateStr}_${timeStr}_${suffix}`
}

function rapportDir(chantierName) {
  return `${BASE_DIR}/${sanitize(chantierName)}/rapport`
}

function pleineResolutionDir(chantierName) {
  return `${BASE_DIR}/${sanitize(chantierName)}/PleineResolution`
}

// Retourne { filename, baseName } — baseName partagé avec thumbnail et note
export async function storePhoto(fileBuffer, originalName, { chantierName, timestamp }) {
  const ext      = path.extname(originalName) || '.jpg'
  const baseName = buildBaseName(chantierName, timestamp)
  const filename = `${baseName}${ext}`
  const naspath  = `${pleineResolutionDir(chantierName)}/${filename}`

  await writeFile(naspath, fileBuffer.toString('base64'), 'base64')
  return { filename, baseName }
}

// baseName fourni par storePhoto → NomPrincipal_thumb.jpg
export async function storeThumbnail(fileBuffer, baseName, { chantierName }) {
  const filename = `${baseName}_thumb.jpg`
  const naspath  = `${rapportDir(chantierName)}/${filename}`

  await writeFile(naspath, fileBuffer.toString('base64'), 'base64')
  return filename
}

// baseName fourni par storePhoto → NomPrincipal_notes.txt
export async function storeNote(fileBuffer, baseName, { chantierName }) {
  const filename = `${baseName}_notes.txt`
  const naspath  = `${rapportDir(chantierName)}/${filename}`

  await writeFile(naspath, fileBuffer.toString('utf8'))
  return filename
}

export async function storeRapport(fileBuffer, { chantierName, timestamp }) {
  const baseName = buildBaseName(chantierName, timestamp)
  const filename = `${baseName}_rapport.pdf`
  const naspath  = `${rapportDir(chantierName)}/${filename}`

  await writeFile(naspath, fileBuffer.toString('base64'), 'base64')
  return filename
}
