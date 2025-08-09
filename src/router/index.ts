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
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallback.vue')
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
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  
  // If auth store is not initialized yet, wait for initialization
  if (!authStore.initialized) {
    console.log('🔒 Router guard: waiting for auth initialization...')
    await authStore.initialize()
  }
  
  console.log('🔒 Router guard check:', { 
    path: to.path, 
    requiresAuth: to.meta.requiresAuth, 
    requiresGuest: to.meta.requiresGuest,
    hasUser: !!authStore.user,
    userEmail: authStore.user?.email 
  })
  
  if (to.meta.requiresAuth && !authStore.user) {
    console.log('🔒 Redirecting to login (no user)')
    next('/login')
  } else if (to.meta.requiresGuest && authStore.user) {
    console.log('🔒 Redirecting to lobby (already logged in)')
    next('/lobby')
  } else {
    console.log('🔒 Allowing navigation')
    next()
  }
})

export default router