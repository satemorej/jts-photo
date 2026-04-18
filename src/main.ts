import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/global.css'

declare const __APP_ENV__: string
document.documentElement.setAttribute('data-env', __APP_ENV__)

// Reload the page when a new service worker takes control
// so users always get the latest assets without manually closing the app.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
