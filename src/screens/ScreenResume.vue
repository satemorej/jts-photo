<template>
  <div class="screen">
    <main class="screen-body">
      <!-- Liste des chantiers ouverts -->
      <div v-if="sessionStore.loading" class="loading-state">Chargement…</div>

      <div v-else-if="sessionStore.activeSessions.length === 0" class="empty-state">
        <div class="empty-icon">📷</div>
        <p>Aucun chantier en cours</p>
        <p class="empty-sub">Créez-en un ci-dessous</p>
      </div>

      <div v-else class="sessions-list">
        <div
          v-for="session in sessionStore.activeSessions"
          :key="session.id"
          class="session-card"
          @click="router.push(`/galerie/${session.id}`)"
        >
          <p class="session-name">{{ session.chantierName }} <span class="session-date">{{ formatDate(session.createdAt) }}</span></p>
          <span class="session-counter">
            {{ session.photos.filter(p => p.uploaded).length }}T
            / {{ session.photos.length }}P
            <template v-if="queueStore.pendingCount"> / {{ queueStore.pendingCount }}F</template>
          </span>
          <span class="session-chevron">›</span>
        </div>
      </div>
    </main>

    <!-- Saisie + création -->
    <footer class="start-footer">
      <div class="field new-field">
        <input
          :value="chantierName"
          type="text"
          placeholder="Nom du chantier…"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          maxlength="100"
          @input="chantierName = ($event.target as HTMLInputElement).value.toUpperCase()"
          @keydown.enter="create"
        />
      </div>
      <button
        class="btn btn-primary btn-full"
        :disabled="!chantierName.trim() || creating"
        @click="create"
      >
        {{ creating ? 'Création…' : 'Créer' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { useQueueStore } from '@/stores/queueStore'

const router = useRouter()
const sessionStore = useSessionStore()
const queueStore = useQueueStore()

const chantierName = ref('')
const creating = ref(false)

onMounted(async () => {
  await Promise.all([sessionStore.loadSessions(), queueStore.loadQueue()])
})

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function create() {
  if (!chantierName.value.trim() || creating.value) return
  creating.value = true
  try {
    const session = await sessionStore.createSession(chantierName.value)
    chantierName.value = ''
    router.push(`/session/${session.id}`)
  } finally {
    creating.value = false
  }
}

</script>

<style scoped>
.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 10px 10px 14px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  transition: opacity 0.12s ease, transform 0.1s ease;
  min-height: 44px;
}
.session-card:active {
  opacity: 0.7;
  transform: scale(0.985);
}

.session-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.session-date {
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-dim);
  margin-left: 4px;
}

.session-counter {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-dim);
  white-space: nowrap;
}

.session-chevron {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--color-text-dim);
  opacity: 0.35;
  line-height: 1;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-dim);
}
.empty-icon { font-size: 48px; }
.empty-sub  { font-size: 13px; }

/* Footer spécifique STARTVIEW */
.start-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px calc(12px + var(--safe-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.new-field {
  margin: 0;
}
</style>
