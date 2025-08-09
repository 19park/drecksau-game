import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL as string),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/lobby',
      name: 'lobby',
      component: () => import('@/views/Lobby.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/room/:id',
      name: 'room',
      component: () => import('@/views/Room.vue'),
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/game/:id',
      name: 'game',
      component: () => import('@/views/Game.vue'),
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/tournament',
      name: 'tournament',
      component: () => import('@/views/Tournament.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Auth guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.user) {
    next('/lobby')
  } else {
    next()
  }
})

export default router