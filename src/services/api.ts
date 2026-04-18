// API service — communication avec le backend JTS

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface UploadMeta {
  sessionId: string
  chantierName: string
  timestamp: number
  photoId?: string
  mediaLabel?: string  // ex: "photo_1", "video_2"
}

export interface ApiResponse {
  success: boolean
  error?: string
  filename?: string
  baseName?: string
}

async function postForm(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Erreur réseau')
    return { success: false, error: text }
  }

  try {
    return await res.json()
  } catch {
    return { success: false, error: 'Réponse invalide du serveur' }
  }
}

export async function uploadPhoto(
  blob: Blob,
  meta: UploadMeta
): Promise<ApiResponse> {
  const fd = new FormData()
  const filename = `${meta.chantierName}_${meta.timestamp}_${meta.photoId ?? 'photo'}.jpg`
  fd.append('file', blob, filename)
  fd.append('sessionId', meta.sessionId)
  fd.append('chantierName', meta.chantierName)
  fd.append('timestamp', String(meta.timestamp))
  if (meta.photoId)    fd.append('photoId', meta.photoId)
  if (meta.mediaLabel) fd.append('mediaLabel', meta.mediaLabel)

  return postForm('/upload/photo', fd)
}

export async function uploadVideo(
  blob: Blob,
  meta: UploadMeta
): Promise<ApiResponse> {
  const ext = blob.type.includes('quicktime') ? 'mov' : (blob.type.split('/')[1] || 'mp4')
  const filename = `${meta.chantierName}_${meta.timestamp}_${meta.photoId ?? 'video'}.${ext}`
  const fd = new FormData()
  fd.append('file', blob, filename)
  fd.append('sessionId', meta.sessionId)
  fd.append('chantierName', meta.chantierName)
  fd.append('timestamp', String(meta.timestamp))
  if (meta.photoId)    fd.append('photoId', meta.photoId)
  if (meta.mediaLabel) fd.append('mediaLabel', meta.mediaLabel)
  return postForm('/upload/video', fd)
}

export async function uploadThumbnail(
  blob: Blob,
  baseName: string,
  meta: UploadMeta
): Promise<ApiResponse> {
  const fd = new FormData()
  fd.append('file', blob, `${baseName}_thumb.jpg`)
  fd.append('sessionId', meta.sessionId)
  fd.append('chantierName', meta.chantierName)
  fd.append('baseName', baseName)

  return postForm('/upload/thumbnail', fd)
}

/** Formate un tableau de textes de notes en un seul fichier lisible. */
export function formatNotes(texts: string[]): string {
  if (texts.length === 1) return texts[0]
  return texts.map((t, i) => `[Note ${i + 1}]\n${t}`).join('\n\n')
}

export async function uploadNote(
  text: string,
  baseName: string,
  meta: UploadMeta
): Promise<ApiResponse> {
  const blob = new Blob([text], { type: 'text/plain' })
  const fd = new FormData()
  fd.append('file', blob, `${baseName}_notes.txt`)
  fd.append('sessionId', meta.sessionId)
  fd.append('chantierName', meta.chantierName)
  fd.append('baseName', baseName)

  return postForm('/upload/note', fd)
}

export async function uploadReport(
  blob: Blob,
  meta: UploadMeta
): Promise<ApiResponse> {
  const date = new Date(meta.timestamp).toISOString().slice(0, 10)
  const filename = `rapport_${meta.chantierName}_${date}.pdf`
  const fd = new FormData()
  fd.append('file', blob, filename)
  fd.append('sessionId', meta.sessionId)
  fd.append('chantierName', meta.chantierName)
  fd.append('timestamp', String(meta.timestamp))
  return postForm('/upload/report', fd)
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export async function checkHealthLatency(): Promise<{ ok: boolean; latencyMs: number | null }> {
  const start = Date.now()
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) })
    return { ok: res.ok, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: null }
  }
}
