import { Router } from 'express'
import multer from 'multer'
import { storePhoto, storeVideo, storeThumbnail, storeNote, storeRapport } from '../services/storage.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
})

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }
})

function getMeta(body) {
  const { sessionId, chantierName, timestamp } = body
  if (!sessionId || !chantierName || !timestamp) {
    throw new Error('Métadonnées manquantes (sessionId, chantierName, timestamp)')
  }
  return { sessionId, chantierName, timestamp }
}

router.post('/photo', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' })
    const meta = { ...getMeta(req.body), mediaLabel: req.body.mediaLabel }
    const { filename, baseName } = await storePhoto(req.file.buffer, req.file.originalname, meta)
    res.json({ success: true, filename, baseName })
  } catch (err) {
    console.error('[upload/photo]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/video', uploadVideo.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' })
    const meta = { ...getMeta(req.body), mediaLabel: req.body.mediaLabel }
    const { filename, baseName } = await storeVideo(req.file.buffer, req.file.originalname, meta)
    res.json({ success: true, filename, baseName })
  } catch (err) {
    console.error('[upload/video]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/thumbnail', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' })
    const { sessionId, chantierName, baseName } = req.body
    if (!sessionId || !chantierName || !baseName) {
      return res.status(400).json({ success: false, error: 'Métadonnées manquantes (sessionId, chantierName, baseName)' })
    }
    const filename = await storeThumbnail(req.file.buffer, baseName, { chantierName })
    res.json({ success: true, filename })
  } catch (err) {
    console.error('[upload/thumbnail]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/note', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' })
    const { sessionId, chantierName, baseName } = req.body
    if (!sessionId || !chantierName || !baseName) {
      return res.status(400).json({ success: false, error: 'Métadonnées manquantes (sessionId, chantierName, baseName)' })
    }
    const filename = await storeNote(req.file.buffer, baseName, { chantierName })
    res.json({ success: true, filename })
  } catch (err) {
    console.error('[upload/note]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/report', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' })
    const meta = getMeta(req.body)
    const filename = await storeRapport(req.file.buffer, meta)
    res.json({ success: true, filename })
  } catch (err) {
    console.error('[upload/report]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
