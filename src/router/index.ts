import { createRouter, createWebHistory } from 'vue-router'
import ScreenResume from '@/screens/ScreenResume.vue'
import ScreenGalerie from '@/screens/ScreenGalerie.vue'
import ScreenUpload from '@/screens/ScreenUpload.vue'
import ScreenQueue from '@/screens/ScreenQueue.vue'
import ScreenReseau from '@/screens/ScreenReseau.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'start',
      component: ScreenResume
    },
    {
      // Rétrocompatibilité : ancienne route session → galerie
      path: '/session/:id',
      redirect: (to) => ({ path: `/galerie/${to.params.id}` })
    },
    {
      path: '/galerie/:id',
      name: 'galerie',
      component: ScreenGalerie,
      props: true
    },
    {
      path: '/upload/:id',
      name: 'upload',
      component: ScreenUpload,
      props: true
    },
    {
      path: '/queue',
      name: 'queue',
      component: ScreenQueue
    },
    {
      path: '/reseau',
      name: 'reseau',
      component: ScreenReseau
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

export default router
