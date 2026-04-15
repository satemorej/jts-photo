<template>
  <div class="screen">
    <header class="screen-header">
      <button class="btn btn-icon" @click="router.back()">‹</button>
      <h1>Nouveau chantier</h1>
    </header>

    <main class="screen-body">
      <form class="new-form" @submit.prevent="create">
        <div class="field">
          <label for="chantierName">Nom du chantier</label>
          <input
            id="chantierName"
            ref="nameInput"
            v-model="chantierName"
            type="text"
            placeholder="Ex: Dupont - Salle de bain"
            autocomplete="off"
            autocorrect="off"
            maxlength="100"
            required
          />
        </div>

        <div class="date-preview card">
          <p class="date-label">Date de création</p>
          <p class="date-value">{{ todayLabel }}</p>
        </div>
      </form>
    </main>

    <footer class="screen-footer">
      <button
        class="btn btn-primary btn-full"
        :disabled="!chantierName.trim() || creating"
        @click="create"
      >
        {{ creating ? 'Création…' : 'Créer et démarrer' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'

const router = useRouter()
const sessionStore = useSessionStore()

const chantierName = ref('')
const creating = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

const todayLabel = computed(() =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
)

onMounted(() => {
  setTimeout(() => nameInput.value?.focus(), 100)
})

async function create() {
  if (!chantierName.value.trim() || creating.value) return
  creating.value = true
  try {
    const session = await sessionStore.createSession(chantierName.value)
    router.replace(`/session/${session.id}`)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.new-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.date-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.date-value {
  font-size: 15px;
  text-transform: capitalize;
}
</style>
