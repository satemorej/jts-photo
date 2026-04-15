<template>
  <div class="screen">
    <nav class="screen-nav">
      <h2>{{ session?.chantierName ?? 'Transfert' }}</h2>
    </nav>

    <main class="screen-body">
      <div v-if="!session" class="loading-state">Chargement…</div>

      <template v-else>
        <!-- Progression -->
        <div v-if="status === 'uploading'" class="upload-progress">
          <div class="spinner" />
          <p class="progress-label">{{ doneCount }} / {{ totalCount }} envoyé(s)…</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="`width:${progress}%`" />
          </div>
        </div>

        <!-- Résultat -->
        <div v-if="status === 'done'" class="result-block">
          <div class="result-icon">{{ failedCount === 0 ? '✅' : '⚠️' }}</div>
          <p class="result-title">
            {{ failedCount === 0 ? 'Transfert terminé' : 'Transfert partiel' }}
          </p>
          <div class="result-counts">
            <div class="count-chip chip-ok">
              <span>{{ doneCount - failedCount }}</span>
              <span>transféré(s)</span>
            </div>
            <div v-if="failedCount > 0" class="count-chip chip-warn">
              <span>{{ failedCount }}</span>
              <span>en attente</span>
            </div>
          </div>
          <!-- Rapport (seulement en mode clore) -->
          <div v-if="isCloseMode" class="report-status" :class="reportUploaded ? 'rep-ok' : 'rep-ko'">
            Rapport PDF : {{ reportUploaded ? '✅ envoyé' : '❌ non envoyé' }}
          </div>
        </div>

        <!-- Grilles miniatures -->
        <div v-if="status === 'done' && (uploaded.length > 0 || pending.length > 0)" class="thumbs-section">
          <div v-if="uploaded.length > 0">
            <p class="thumbs-label thumbs-label-ok">Transférées ({{ uploaded.length }})</p>
            <div class="thumbs-grid">
              <div v-for="p in uploaded" :key="p.id" class="thumb-cell thumb-ok">
                <img :src="p.thumbnail" class="thumb-img" alt="" />
                <span class="thumb-check">✓</span>
              </div>
            </div>
          </div>

          <div v-if="pending.length > 0">
            <p class="thumbs-label thumbs-label-warn">En attente ({{ pending.length }})</p>
            <div class="thumbs-grid">
              <div v-for="p in pending" :key="p.id" class="thumb-cell thumb-warn">
                <img :src="p.thumbnail" class="thumb-img" alt="" />
                <span class="thumb-check">⏳</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Avertissement réseau (idle) -->
        <div v-if="status === 'idle'">
          <p v-if="!uiStore.isOnline" class="net-warn">
            ⚠️ Hors ligne — les fichiers iront en file d'attente.
          </p>
          <p v-else-if="!uiStore.backendOk" class="net-warn">
            ⚠️ NAS inaccessible — les fichiers iront en file d'attente.
          </p>
        </div>
      </template>
    </main>

    <footer class="screen-footer" style="flex-direction:column; gap:8px;">
      <div class="footer-row">
        <button
          v-if="status !== 'uploading'"
          class="btn btn-secondary"
          style="flex:1"
          @click="testNas"
          :disabled="testingNas"
        >
          {{ testingNas ? '…' : 'Test NAS' }}
        </button>
        <button
          v-if="status === 'idle'"
          class="btn btn-primary"
          style="flex:2"
          :disabled="!pendingPhotos.length"
          @click="startUpload"
        >
          Envoyer
        </button>
      </div>
      <button class="btn btn-secondary btn-full" @click="router.push('/')">
        Retour
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { useQueueStore } from '@/stores/queueStore'
import { useUiStore } from '@/stores/uiStore'
import { uploadPhoto, uploadThumbnail, uploadNote, uploadReport, checkHealth } from '@/services/api'
import { generateSessionReportBlob } from '@/services/pdfReport'
import type { Photo } from '@/services/db'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const queueStore = useQueueStore()
const uiStore = useUiStore()

type Status = 'idle' | 'uploading' | 'done'
const status = ref<Status>('idle')
const doneCount = ref(0)
const failedCount = ref(0)
const totalCount = ref(0)
const reportUploaded = ref(false)
const testingNas = ref(false)

const uploaded = ref<Photo[]>([])
const pending = ref<Photo[]>([])

const session = computed(() => sessionStore.currentSession)
const isCloseMode = computed(() => route.query.mode === 'close')

const pendingPhotos = computed(() =>
  session.value?.photos.filter(p => !p.uploaded) ?? []
)

const progress = computed(() =>
  totalCount.value ? Math.round((doneCount.value / totalCount.value) * 100) : 0
)

onMounted(async () => {
  await sessionStore.loadSession(route.params.id as string)
  if (isCloseMode.value) {
    await startUpload()
  }
})

async function startUpload() {
  if (!session.value || status.value === 'uploading') return
  status.value = 'uploading'
  doneCount.value = 0
  failedCount.value = 0
  uploaded.value = []
  pending.value = []
  reportUploaded.value = false

  const meta = {
    sessionId: session.value.id,
    chantierName: session.value.chantierName,
    timestamp: Date.now()
  }

  const photos = [...pendingPhotos.value]
  // count: photos + notes + optional report
  const noteCount = photos.reduce((n, p) => n + p.notes.length, 0)
  totalCount.value = photos.length + noteCount + (isCloseMode.value ? 1 : 0)

  for (const photo of photos) {
    const blob = await fetch(photo.dataUrl).then(r => r.blob())
    const res = await uploadPhoto(blob, { ...meta, photoId: photo.id })
    if (res.success && res.baseName) {
      await sessionStore.markPhotoUploaded(photo.id)
      uploaded.value.push(photo)
      // Miniature — même baseName que la photo
      const thumbBlob = await fetch(photo.thumbnail).then(r => r.blob())
      await uploadThumbnail(thumbBlob, res.baseName, { ...meta, photoId: photo.id })
      // Notes
      for (const note of photo.notes) {
        const nres = await uploadNote(note.text, res.baseName, { ...meta, photoId: photo.id })
        if (!nres.success) {
          await queueStore.addNoteToQueue(session.value.id, session.value.chantierName, photo.id, note.text, res.baseName)
          failedCount.value++
        }
        doneCount.value++
      }
    } else {
      await queueStore.addPhotoToQueue(session.value.id, session.value.chantierName, photo.id, photo.dataUrl)
      pending.value.push(photo)
      failedCount.value++
      doneCount.value += photo.notes.length // compter quand même les notes skippées
    }
    doneCount.value++
  }

  // Rapport PDF si mode close
  if (isCloseMode.value) {
    try {
      const pdfBlob = await generateSessionReportBlob(session.value)
      const rres = await uploadReport(pdfBlob, meta)
      reportUploaded.value = rres.success
    } catch {
      reportUploaded.value = false
    }
    doneCount.value++

    // Supprimer la session si tout ok
    if (failedCount.value === 0) {
      await sessionStore.removeSession(session.value.id)
    } else {
      await sessionStore.setSessionStatus('done')
    }
  }

  status.value = 'done'
}

async function testNas() {
  testingNas.value = true
  const ok = await checkHealth()
  uiStore.showToast(ok ? 'NAS accessible ✓' : 'NAS inaccessible ✗', ok ? 'success' : 'error')
  testingNas.value = false
}
</script>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--color-text-dim);
}

/* Spinner */
.upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.progress-label {
  font-size: 14px;
  color: var(--color-text-dim);
}

.progress-bar {
  width: 100%;
  max-width: 280px;
  height: 6px;
  background: var(--color-surface-2);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 3px;
  transition: width 0.3s;
}

/* Résultat */
.result-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0 16px;
}

.result-icon { font-size: 48px; }
.result-title { font-size: 18px; font-weight: 700; }

.result-counts {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.count-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 12px;
  gap: 2px;
}
.count-chip span:first-child { font-size: 22px; font-weight: 700; }
.chip-ok   { background: rgba(76,175,80,0.15); color: var(--color-success); }
.chip-warn { background: rgba(245,166,35,0.15); color: var(--color-warning); }

.report-status {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 10px;
}
.rep-ok  { background: rgba(76,175,80,0.12); color: var(--color-success); }
.rep-ko  { background: rgba(224,82,82,0.12); color: var(--color-danger); }

/* Grilles miniatures */
.thumbs-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.thumbs-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.thumbs-label-ok   { color: var(--color-success); }
.thumbs-label-warn { color: var(--color-warning); }

.thumbs-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.thumb-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
}
.thumb-ok   { border-color: var(--color-success); }
.thumb-warn { border-color: var(--color-warning); }

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-check {
  position: absolute;
  bottom: 2px;
  right: 3px;
  font-size: 10px;
  line-height: 1;
}

/* Avertissement réseau */
.net-warn {
  font-size: 13px;
  color: var(--color-warning);
  background: rgba(245,166,35,0.1);
  border: 1px solid var(--color-warning);
  border-radius: 10px;
  padding: 10px 14px;
}

/* Footer */
.footer-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>
