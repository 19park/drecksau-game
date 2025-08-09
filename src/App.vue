<template>
  <div id="app" class="min-h-screen">
    <header class="bg-white/90 backdrop-blur-sm shadow-game sticky top-0 z-50">
      <nav class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <router-link to="/" class="flex items-center space-x-2">
            <span class="text-3xl">🐷</span>
            <span class="font-game text-2xl text-primary-600">Drecksau</span>
          </router-link>
          
          <div class="flex items-center space-x-4">
            <div v-if="user" class="flex items-center space-x-2">
              <span class="text-sm text-gray-600">Hello, {{ user.email }}</span>
              <button @click="signOut" class="text-sm text-red-500 hover:text-red-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <main class="container mx-auto px-4 py-8">
      <router-view />
    </main>

    <!-- Loading overlay -->
    <div v-if="loading" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-8 flex flex-col items-center space-y-4">
        <div class="loading-spinner"></div>
        <p class="text-gray-600">Loading...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const user = computed(() => authStore.user)
const loading = computed(() => authStore.loading)

const signOut = async () => {
  await authStore.signOut()
}

// Initialize auth on app start
authStore.initialize()
</script>