// IndexedDB service for JTS Photo

export interface PhotoNote {
  id: string
  text: string
  createdAt: number
}

export interface Photo {
  id: string
  dataUrl: string  // full-res data URL (base64) — Blob évité pour compatibilité iOS IndexedDB
  thumbnail: string // dataUrl redimensionné
  notes: PhotoNote[]
  createdAt: number
  uploaded: boolean
  uploadFailed?: boolean
  mediaType?: 'photo' | 'video'
  coords?: { lat: number; lng: number }
}

export interface SessionLocation {
  lat: number
  lng: number
  address?: string
}

export interface Session {
  id: string
  date: string
  chantierName: string
  photos: Photo[]
  status: 'active' | 'uploading' | 'done'
  createdAt: number
  location?: SessionLocation
}

export interface QueueItem {
  id: string
  sessionId: string
  chantierName: string
  photoId?: string
  dataUrl: string  // dataUrl photo ou texte encodé pour note
  type: 'photo' | 'note' | 'video'
  noteText?: string
  baseName?: string   // nom de base partagé photo/thumb/note
  mediaLabel?: string // ex: "photo_1", "video_2"
  retryCount: number
  lastAttempt: number
  lastError?: string
  createdAt: number
}

export interface HistoryEntry {
  id: string
  type: 'photo' | 'note' | 'report' | 'video'
  chantierName: string
  filename: string
  transferredAt: number
}

const DB_NAME = 'jts-photo-db'
const DB_VERSION = 1

const STORE_SESSIONS = 'sessions'
const STORE_QUEUE = 'queue'

let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const ss = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' })
        ss.createIndex('status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const qs = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
        qs.createIndex('sessionId', 'sessionId', { unique: false })
      }
    }

    req.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    req.onerror = () => reject(req.error)
  })
}

function tx(
  storeName: string,
  mode: IDBTransactionMode,
  db: IDBDatabase
): IDBObjectStore {
  return db.transaction(storeName, mode).objectStore(storeName)
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ===== SESSIONS =====

export async function saveSession(session: Session): Promise<void> {
  const db = await openDB()
  await wrap(tx(STORE_SESSIONS, 'readwrite', db).put(JSON.parse(JSON.stringify(session))))
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await openDB()
  return wrap(tx(STORE_SESSIONS, 'readonly', db).get(id))
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await openDB()
  return wrap(tx(STORE_SESSIONS, 'readonly', db).getAll())
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB()
  await wrap(tx(STORE_SESSIONS, 'readwrite', db).delete(id))
}

// ===== QUEUE =====

export async function enqueue(item: QueueItem): Promise<void> {
  const db = await openDB()
  await wrap(tx(STORE_QUEUE, 'readwrite', db).put(item))
}

export async function getQueue(): Promise<QueueItem[]> {
  const db = await openDB()
  return wrap(tx(STORE_QUEUE, 'readonly', db).getAll())
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB()
  await wrap(tx(STORE_QUEUE, 'readwrite', db).delete(id))
}

export async function updateQueueItem(item: QueueItem): Promise<void> {
  const db = await openDB()
  await wrap(tx(STORE_QUEUE, 'readwrite', db).put(item))
}

// ===== UTILS =====

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function generateThumbnail(dataUrl: string, maxSize = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
