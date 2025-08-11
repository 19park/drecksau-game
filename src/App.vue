<template>
  <div id="app" class="min-h-screen">
    <header class="bg-white/90 backdrop-blur-sm shadow-game sticky top-0 z-50">
      <nav class="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div class="flex items-center justify-between min-h-[2.5rem]">
          <router-link to="/" class="flex items-center space-x-2 shrink-0">
            <span class="text-2xl sm:text-3xl">🐷</span>
            <span class="font-game text-xl sm:text-2xl text-primary-600">Drecksau</span>
          </router-link>
          
          <div v-if="user" class="flex items-center space-x-2 min-w-0">
            <!-- Desktop Layout -->
            <div class="hidden sm:flex items-center space-x-3">
              <span class="text-sm text-gray-600 truncate max-w-[200px]" :title="user.email">
                Hello, {{ user.email }}
              </span>
              <button @click="signOut" class="shrink-0 text-sm text-red-500 hover:text-red-700 font-medium">
                Logout
              </button>
            </div>
            
            <!-- Mobile Layout -->
            <div class="flex sm:hidden items-center space-x-2">
              <div class="flex flex-col items-end">
                <span class="text-xs text-gray-600 truncate max-w-[120px]" :title="user.email">
                  {{ user.email }}
                </span>
              </div>
              <button @click="signOut" class="shrink-0 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded">
                Exit
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <main class="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <router-view />
    </main>

    <!-- Loading overlay -->
    <div v-if="loading" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl p-6 sm:p-8 flex flex-col items-center space-y-4">
        <div class="loading-spinner"></div>
        <p class="text-gray-600 text-sm sm:text-base">Loading...</p>
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