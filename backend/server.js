import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import uploadRouter from './routes/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT       = Number(process.env.PORT ?? 3001)
const STATIC_DIR = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.join(__dirname, 'public')

// Certificat Tailscale (chemin standard sur Synology DSM)
const TLS_CERT = process.env.TLS_CERT ?? '/var/lib/tailscale/certs/nas-jts.persian-kelvin.ts.net.crt'
const TLS_KEY  = process.env.TLS_KEY  ?? '/var/lib/tailscale/certs/nas-jts.persian-kelvin.ts.net.key'

const app = express()

// Confiance au reverse proxy (Synology / Tailscale serve) pour le X-Forwarded-Proto
app.set('trust proxy', 1)

// CORS (uniquement si frontend non servi par ce process)
if (!process.env.STATIC_DIR) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'
  app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] }))
}

app.use(express.json({ limit: '1mb' }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now(), env: process.env.APP_ENV ?? 'unknown' })
})

// Upload routes
app.use('/api/upload', uploadRouter)

// Frontend statique + SPA fallback
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR, {
    setHeaders (res) {
      // Cache agressif pour les assets hashés, no-cache pour index.html et sw.js
      const url = res.req?.url ?? ''
      if (url.includes('sw.js') || url === '/' || url.endsWith('.html')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      }
    }
  }))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'))
  })
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[server error]', err)
  res.status(500).json({ error: 'Erreur serveur' })
})

// ── Démarrage ────────────────────────────────────────────────
const hasTls = fs.existsSync(TLS_CERT) && fs.existsSync(TLS_KEY)

if (hasTls) {
  const tlsOptions = {
    cert: fs.readFileSync(TLS_CERT),
    key:  fs.readFileSync(TLS_KEY)
  }
  https.createServer(tlsOptions, app).listen(PORT, () => {
    console.log(`JTS Photo [${process.env.APP_ENV ?? 'local'}] listening on https://0.0.0.0:${PORT}`)
    console.log(`  TLS     → ${TLS_CERT}`)
    console.log(`  Static  → ${fs.existsSync(STATIC_DIR) ? STATIC_DIR : '(non servi)'}`)
    console.log(`  Gateway → ${process.env.GATEWAY_URL ?? '(non configuré)'}`)
    console.log(`  Photos  → ${process.env.PHOTOS_DIR ?? '/volume1/photo/photos-jts'} (via gateway)`)
    console.log(`  Notes   → ${process.env.NOTES_DIR ?? '/volume1/JTSAGENCEMENT/1-CHANTIERS/_inbox'} (via gateway)`)
  })
} else {
  // Fallback HTTP (dev local uniquement)
  http.createServer(app).listen(PORT, () => {
    console.warn(`⚠ Certificat TLS introuvable — démarrage en HTTP (dev local uniquement)`)
    console.log(`JTS Photo [${process.env.APP_ENV ?? 'local'}] listening on http://0.0.0.0:${PORT}`)
    console.log(`  Static  → ${fs.existsSync(STATIC_DIR) ? STATIC_DIR : '(non servi)'}`)
  })
}
