<template>
  <div class="screen">
    <nav class="screen-nav">
      <h2>{{ session?.chantierName ?? '…' }}</h2>
      <button class="btn btn-danger btn-clore" :disabled="closing" @click="confirmClore">
        {{ closing ? '…' : 'Clore' }}
      </button>
    </nav>

    <!-- Compteur -->
    <div v-if="session" class="photo-counter">
      <span>📱 {{ session.photos.length }} photo{{ session.photos.length !== 1 ? 's' : '' }}</span>
      <span class="counter-sep">·</span>
      <span class="counter-sent">✓ {{ uploadedCount }} transférée{{ uploadedCount !== 1 ? 's' : '' }}</span>
    </div>

    <main class="screen-body">
      <div v-if="!session" class="loading-state">Chargement…</div>

      <template v-else>
        <div v-if="session.photos.length === 0" class="empty-state">
          <div class="empty-icon">📷</div>
          <p>Aucune photo</p>
          <p class="empty-sub">Appuyez sur Photo pour commencer</p>
        </div>

        <div v-else class="photo-grid">
          <div
            v-for="photo in session.photos"
            :key="photo.id"
            class="thumb-wrap"
            :class="{ 'is-selected': selectedIds.has(photo.id), 'is-uploaded': photo.uploaded }"
            @click="onThumbTap(photo.id)"
          >
            <img :src="photo.thumbnail" class="thumb-img" :alt="'Photo'" />

            <!-- Badge note -->
            <div v-if="photo.notes.length > 0" class="note-badge">
              🗒 {{ photo.notes.length }}
            </div>

            <!-- Badge transférée -->
            <div v-if="photo.uploaded" class="uploaded-badge">✓</div>

            <!-- Checkbox sélection -->
            <div class="sel-check" :class="{ checked: selectedIds.has(photo.id) }">
              <span v-if="selectedIds.has(photo.id)">✓</span>
            </div>
          </div>
        </div>

        <!-- Progression transfert -->
        <div v-if="transferring" class="transfer-progress">
          <div class="spinner-sm" />
          <span>{{ transferDone }} / {{ transferTotal }} envoyé(s)…</span>
        </div>
      </template>
    </main>

    <!-- Footer -->
    <footer class="screen-footer footer-galerie">
      <!-- Rangée 1 : sélection + capture -->
      <div class="footer-row">
        <!-- Sélectionner tout / aucun -->
        <button class="btn btn-secondary icon-btn" @click="toggleSelectAll" :disabled="!session?.photos.length">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <polyline v-if="allSelected" points="9 12 11 14 15 10"/>
          </svg>
        </button>
        <!-- Capture photo (bouton principal) -->
        <button class="btn btn-primary icon-btn icon-btn-main" @click="triggerPhoto" :disabled="!session">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <!-- Capture vidéo -->
        <button class="btn btn-secondary icon-btn" @click="triggerVideo" :disabled="!session">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </button>
      </div>
      <!-- Rangée 2 : transfert + suppression -->
      <div class="footer-row">
        <button
          class="btn btn-primary icon-btn icon-btn-action"
          style="flex:1"
          :disabled="!selectedPending.length || transferring"
          @click="transferSelected"
        >
          <span class="icon-badge-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
            <span v-if="transferring" class="icon-badge badge-spin">…</span>
            <span v-else-if="selectedPending.length" class="icon-badge">{{ selectedPending.length }}</span>
          </span>
        </button>
        <button
          class="btn btn-danger icon-btn icon-btn-action"
          style="flex:1"
          :disabled="!selectedIds.size || transferring"
          @click="showDeleteConfirm = true"
        >
          <span class="icon-badge-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            <span v-if="selectedIds.size" class="icon-badge">{{ selectedIds.size }}</span>
          </span>
        </button>
      </div>
    </footer>

    <!-- Inputs caméra cachés -->
    <input
      ref="photoInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display:none"
      @change="onFileSelected('photo', $event)"
    />
    <input
      ref="videoInput"
      type="file"
      accept="video/*"
      capture="environment"
      style="display:none"
      @change="onFileSelected('video', $event)"
    />

    <!-- Overlay review post-capture -->
    <Transition name="sheet">
      <div v-if="showReview" class="review-backdrop">
        <div class="review-sheet">
          <div class="review-preview">
            <img v-if="!reviewIsVideo" :src="reviewPhotoUrl" class="review-img" alt="Nouvelle capture" />
            <div v-else class="review-video-placeholder">🎥</div>
            <div class="review-label">{{ reviewIsVideo ? 'Vidéo ajoutée' : 'Photo ajoutée' }}</div>
          </div>

          <div class="note-area">
            <p class="note-prompt">Ajouter une note ?</p>
            <div class="note-input-row">
              <textarea
                ref="noteTextarea"
                v-model="noteText"
                class="note-textarea"
                placeholder="Tapez une note…"
                rows="3"
              />
              <button
                class="btn btn-icon mic-btn"
                :class="{ 'mic-active': listening }"
                @click="toggleDictation"
                title="Dictée vocale"
              >🎙</button>
            </div>
            <p v-if="listening" class="dictation-status">Dictée en cours… parlez</p>
          </div>

          <div class="review-actions">
            <button class="btn btn-secondary" style="flex:1" @click="skipNote">Ignorer</button>
            <button class="btn btn-primary" style="flex:2" @click="saveNote">
              {{ noteText.trim() ? 'Valider la note' : 'Continuer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal CLORE -->
    <Transition name="modal">
      <div v-if="showConfirm" class="modal-backdrop" @click.self="showConfirm = false">
        <div class="modal-box">
          <p class="modal-title">Clore le chantier ?</p>
          <p class="modal-sub">
            Les photos, notes et rapport seront envoyés, puis le chantier sera supprimé.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" style="flex:1" @click="showConfirm = false">Annuler</button>
            <button class="btn btn-danger" style="flex:1" @click="clore">Confirmer</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal SUPPRIMER -->
    <Transition name="modal">
      <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="showDeleteConfirm = false">
        <div class="modal-box">
          <p class="modal-title">Supprimer {{ selectedIds.size }} photo{{ selectedIds.size !== 1 ? 's' : '' }} ?</p>
          <p class="modal-sub">
            Les notes associées seront aussi supprimées. Cette action est irréversible.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" style="flex:1" @click="showDeleteConfirm = false">Annuler</button>
            <button class="btn btn-danger" style="flex:1" @click="deleteSelected">Supprimer</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import { uploadPhoto, uploadThumbnail, uploadNote } from '@/services/api'
import { recordTransfer } from '@/stores/queueStore'

const props = defineProps<{ id: string }>()
const route  = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const uiStore = useUiStore()

const sessionId = computed(() => props.id ?? (route.params.id as string))
const session   = computed(() => sessionStore.currentSession)

// ── Sélection ────────────────────────────────────────────────
const selectedIds       = ref(new Set<string>())
const showDeleteConfirm = ref(false)

const uploadedCount = computed(() =>
  session.value?.photos.filter(p => p.uploaded).length ?? 0
)
const selectedPending = computed(() =>
  session.value?.photos.filter(p => selectedIds.value.has(p.id) && !p.uploaded) ?? []
)
const allSelected = computed(() =>
  !!session.value?.photos.length &&
  session.value.photos.every(p => selectedIds.value.has(p.id))
)

// ── Clore ────────────────────────────────────────────────────
const closing     = ref(false)
const showConfirm = ref(false)

// ── Transfert ────────────────────────────────────────────────
const transferring = ref(false)
const transferDone  = ref(0)
const transferTotal = ref(0)

// ── Capture ──────────────────────────────────────────────────
const photoInput = ref<HTMLInputElement | null>(null)
const videoInput = ref<HTMLInputElement | null>(null)

// ── Review ───────────────────────────────────────────────────
const showReview     = ref(false)
const reviewPhotoId  = ref<string | null>(null)
const reviewPhotoUrl = ref<string | undefined>(undefined)
const reviewIsVideo  = ref(false)
const noteText       = ref('')
const noteTextarea   = ref<HTMLTextAreaElement | null>(null)
const listening      = ref(false)
let   recognition: any = null

onMounted(async () => {
  await sessionStore.loadSession(sessionId.value)
})

// ── Capture ──────────────────────────────────────────────────
function triggerPhoto() { photoInput.value?.click() }
function triggerVideo() { videoInput.value?.click() }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFileSelected(type: 'photo' | 'video', e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''

  try {
    const dataUrl = await fileToDataUrl(file)
    const photo   = await sessionStore.addPhoto(dataUrl)
    reviewPhotoId.value  = photo.id
    reviewPhotoUrl.value = type === 'photo' ? photo.thumbnail : undefined
    reviewIsVideo.value  = type === 'video'
    noteText.value = ''
    showReview.value = true
    await nextTick()
    noteTextarea.value?.focus()
  } catch (err: any) {
    uiStore.showToast(err?.message ?? 'Erreur lors de la capture', 'error')
  }
}

// ── Review ───────────────────────────────────────────────────
async function saveNote() {
  if (reviewPhotoId.value && noteText.value.trim()) {
    await sessionStore.addNoteToPhoto(reviewPhotoId.value, noteText.value)
    uiStore.showToast('Note enregistrée', 'success')
  }
  closeReview()
}

function skipNote() {
  closeReview()
}

function closeReview() {
  stopDictation()
  showReview.value     = false
  reviewPhotoId.value  = null
  reviewPhotoUrl.value = undefined
  reviewIsVideo.value  = false
  noteText.value = ''
}

// ── Dictée ───────────────────────────────────────────────────
function toggleDictation() {
  listening.value ? stopDictation() : startDictation()
}

function startDictation() {
  const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  if (!SR) { uiStore.showToast('Dictée non supportée', 'error'); return }
  recognition = new SR()
  recognition.lang = 'fr-FR'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.onresult = (e: any) => {
    const t = e.results[0]?.[0]?.transcript ?? ''
    noteText.value += (noteText.value ? ' ' : '') + t
    listening.value = false
  }
  recognition.onerror = () => { listening.value = false }
  recognition.onend   = () => { listening.value = false }
  recognition.start()
  listening.value = true
}

function stopDictation() {
  recognition?.stop()
  recognition = null
  listening.value = false
}

// ── Galerie ───────────────────────────────────────────────────
function onThumbTap(photoId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(photoId)) next.delete(photoId)
  else next.add(photoId)
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(session.value?.photos.map(p => p.id) ?? [])
  }
}

// ── Transfert ────────────────────────────────────────────────
async function transferSelected() {
  if (!session.value || transferring.value) return
  const photos = selectedPending.value
  if (!photos.length) return

  transferring.value = true
  transferDone.value  = 0
  transferTotal.value = photos.length

  const meta = {
    sessionId:    session.value.id,
    chantierName: session.value.chantierName,
    timestamp:    Date.now()
  }

  for (const photo of photos) {
    try {
      const blob = await fetch(photo.dataUrl).then(r => r.blob())
      const res  = await uploadPhoto(blob, { ...meta, photoId: photo.id })
      if (res.success && res.baseName) {
        await sessionStore.markPhotoUploaded(photo.id)
        recordTransfer('photo', session.value!.chantierName, res.baseName)
        const thumbBlob = await fetch(photo.thumbnail).then(r => r.blob())
        await uploadThumbnail(thumbBlob, res.baseName, { ...meta, photoId: photo.id })
        for (const note of photo.notes) {
          const nres = await uploadNote(note.text, res.baseName, { ...meta, photoId: photo.id })
          if (nres.success) recordTransfer('note', session.value!.chantierName, `${res.baseName}_note`)
        }
      }
    } catch { /* photo reste non transférée */ }
    transferDone.value++
  }

  transferring.value = false
  const done = session.value.photos.filter(p => selectedIds.value.has(p.id) && p.uploaded).length
  uiStore.showToast(`${done} photo${done !== 1 ? 's' : ''} transférée${done !== 1 ? 's' : ''}`, 'success')
  selectedIds.value = new Set()
}

// ── Suppression ───────────────────────────────────────────────
async function deleteSelected() {
  showDeleteConfirm.value = false
  if (!session.value) return
  const ids = [...selectedIds.value]
  for (const id of ids) await sessionStore.deletePhoto(id)
  uiStore.showToast(`${ids.length} photo${ids.length !== 1 ? 's' : ''} supprimée${ids.length !== 1 ? 's' : ''}`, 'success')
  selectedIds.value = new Set()
}

// ── Clore ─────────────────────────────────────────────────────
function confirmClore() { showConfirm.value = true }

async function clore() {
  showConfirm.value = false
  closing.value = true
  try {
    router.push(`/upload/${sessionId.value}?mode=close`)
  } finally {
    closing.value = false
  }
}
</script>

<style scoped>
/* Compteur */
.photo-counter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-dim);
  padding: 6px 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.counter-sep { opacity: 0.4; }
.counter-sent { color: var(--color-success); }

/* États vides / chargement */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-dim);
}
.empty-icon { font-size: 48px; }
.empty-sub  { font-size: 13px; }

/* Grille */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.thumb-wrap {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
  border: 2px solid transparent;
  transition: border-color 0.15s;
}
.thumb-wrap.is-selected { border-color: var(--color-accent); }
.thumb-wrap.is-uploaded { opacity: 0.65; }

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Badge note */
.note-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  line-height: 14px;
}

/* Badge transférée */
.uploaded-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--color-success);
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}

/* Checkbox sélection */
.sel-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.8);
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}
.sel-check.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

/* Progression transfert */
.transfer-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  font-size: 13px;
  color: var(--color-text-dim);
}
.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Footer */
.footer-galerie {
  flex-direction: column;
  gap: 8px;
}
.footer-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

/* Bouton Clore dans la nav */
.btn-clore {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  height: 34px;
  border-radius: 10px;
  flex-shrink: 0;
}

/* Boutons icônes footer */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 52px;
  padding: 0;
}
.icon-btn svg {
  width: 24px;
  height: 24px;
}
.icon-btn-main {
  flex: 2;
}
.icon-btn-main svg {
  width: 28px;
  height: 28px;
}
.icon-btn-action {
  position: relative;
}

/* Badge sur icône */
.icon-badge-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-badge-wrap svg {
  width: 24px;
  height: 24px;
}
.icon-badge {
  position: absolute;
  top: -8px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #fff;
  color: #000;
  font-size: 10px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
}

/* Overlay review */
.review-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: flex-end;
  z-index: 400;
}

.review-sheet {
  width: 100%;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: 20px 16px calc(16px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 90vh;
  overflow-y: auto;
}

.review-preview {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  max-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.review-img {
  width: 100%;
  max-height: 40vh;
  object-fit: contain;
}
.review-video-placeholder {
  font-size: 64px;
  padding: 32px 0;
}
.review-label {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.note-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.note-prompt {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-dim);
}
.note-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.note-textarea {
  flex: 1;
  min-height: 72px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--color-text);
  font-size: 16px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
}
.note-textarea:focus { border-color: var(--color-accent); }

.mic-btn {
  flex-shrink: 0;
  font-size: 22px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 48px;
  height: 48px;
}
.mic-active {
  background: rgba(224,82,82,0.2);
  border-color: var(--color-danger);
}
.dictation-status {
  font-size: 12px;
  color: var(--color-danger);
  text-align: center;
}

.review-actions {
  display: flex;
  gap: 10px;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  z-index: 500;
}
.modal-box {
  width: 100%;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: 24px 20px calc(16px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-title {
  font-size: 17px;
  font-weight: 700;
  text-align: center;
}
.modal-sub {
  font-size: 13px;
  color: var(--color-text-dim);
  text-align: center;
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from,  .sheet-leave-to      { opacity: 0; }
</style>
