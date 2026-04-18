import axios from 'axios'
import FormData from 'form-data'

function getClient() {
  const url = process.env.GATEWAY_URL
  const key = process.env.GATEWAY_API_KEY
  if (!url || !key) throw new Error('GATEWAY_URL et GATEWAY_API_KEY sont requis')
  return axios.create({
    baseURL: url,
    headers: { 'X-API-Key': key },
    timeout: 15000
  })
}

export async function pingGateway() {
  try {
    const client = getClient()
    const res = await client.get('/api/v1/health')
    return res.status === 200
  } catch {
    return false
  }
}

function unwrap(response) {
  if (response.data?.success) return response.data.data
  const err = response.data?.error
  throw Object.assign(
    new Error(err?.message ?? 'Erreur gateway inconnue'),
    { type: err?.type }
  )
}

/**
 * Upload un fichier vers le NAS via multipart.
 * @param {string} naspath  Chemin complet de destination sur le NAS
 * @param {Buffer} fileBuffer  Contenu du fichier
 * @param {string} filename  Nom du fichier (pour le champ multipart)
 * @param {string} mimeType  Type MIME
 */
export async function uploadToNas(naspath, fileBuffer, filename, mimeType) {
  const client = getClient()
  const form = new FormData()
  form.append('file', fileBuffer, { filename, contentType: mimeType })
  form.append('naspath', naspath)
  const res = await client.post('/api/v1/nas/upload', form, {
    headers: form.getHeaders()
  })
  return unwrap(res)
}

/**
 * Écrit un fichier via le gateway.
 * Accepte un chemin NAS absolu (/volume1/...) ou relatif.
 * Le gateway a FILES_BASE_PATH=/volume1, donc /volume1/ est strippé automatiquement.
 * @param {string} nasPath  Chemin absolu NAS ou relatif
 * @param {string} content  Contenu texte ou base64
 * @param {'base64'|undefined} encoding  'base64' pour les fichiers binaires
 */
export async function writeFile(nasPath, content, encoding) {
  const client = getClient()
  const filePath = nasPath.replace(/^\/volume1\//, '')
  const body = encoding ? { content, encoding } : { content }
  const res = await client.put(`/api/v1/files/${filePath}`, body)
  return unwrap(res)
}

/** Lit un fichier (retourne string brut). */
export async function readFile(filePath) {
  const client = getClient()
  const res = await client.get(`/api/v1/files/${filePath}`)
  return unwrap(res)
}

/** Supprime un fichier. */
export async function deleteFile(filePath) {
  const client = getClient()
  const res = await client.delete(`/api/v1/files/${filePath}`)
  return unwrap(res)
}

/** Liste le contenu d'un dossier. */
export async function listDir(dir) {
  const client = getClient()
  const res = await client.get('/api/v1/files', { params: { dir } })
  return unwrap(res)
}

/** Télécharge un fichier depuis le NAS (retourne un Buffer). */
export async function downloadFromNas(nasPath) {
  const client = getClient()
  const res = await client.get('/api/v1/nas/download', {
    params: { path: nasPath },
    responseType: 'arraybuffer'
  })
  return Buffer.from(res.data)
}
