<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">🐷</div>
        <h1 class="font-game text-4xl text-primary-600 mb-2">드렉사우</h1>
        <p class="text-gray-600">실시간 멀티플레이어 보드게임</p>
      </div>

      <!-- Login Form -->
      <div class="card-base">
        <div class="space-y-6">
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              placeholder="your@email.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :disabled="loading"
              @keyup.enter="handleMagicLinkLogin"
            >
            <p class="mt-1 text-xs text-gray-500">
              📧 이메일로 로그인 링크를 보내드립니다
            </p>
          </div>
          
          <button
            @click="handleMagicLinkLogin"
            :disabled="!isValidEmail || loading"
            class="w-full btn-primary py-3"
            :class="{ 'opacity-50 cursor-not-allowed': !isValidEmail || loading }"
          >
            <span v-if="loading && currentAction === 'magic'" class="loading-spinner mr-2"></span>
            {{ loading && currentAction === 'magic' ? '전송 중...' : '🔗 로그인 링크 받기' }}
          </button>

          <!-- Divider -->
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          <!-- Google Login -->
          <button
            @click="handleGoogleLogin"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium text-gray-700"
            :class="{ 'opacity-50 cursor-not-allowed': loading }"
          >
            <span v-if="loading && currentAction === 'google'" class="loading-spinner"></span>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {{ loading && currentAction === 'google' ? '처리 중...' : 'Google로 시작하기' }}
          </button>

          <!-- Success Message -->
          <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <span class="text-green-400 text-xl">✅</span>
              </div>
              <div class="ml-3">
                <p class="text-sm text-green-800">{{ successMessage }}</p>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <span class="text-red-400 text-xl">❌</span>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-800">{{ errorMessage }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-8 text-sm text-gray-500">
        <p>더럽고 재미있는 돼지 게임의 세계로!</p>
        <div class="mt-2 flex justify-center gap-4">
          <span>🐷 더러운 돼지</span>
          <span>🏠 헛간</span>
          <span>🌧️ 비</span>
          <span>⚡ 벼락</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Form state
const email = ref('')
const loading = ref(false)
const currentAction = ref<'magic' | 'google' | null>(null)
const successMessage = ref('')
const errorMessage = ref('')

// Computed
const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

// Methods
const clearMessages = () => {
  successMessage.value = ''
  errorMessage.value = ''
}

const handleMagicLinkLogin = async () => {
  if (!isValidEmail.value || loading.value) return
  
  clearMessages()
  loading.value = true
  currentAction.value = 'magic'
  
  try {
    const result = await authStore.signInWithMagicLink(email.value)
    
    if (result.error) {
      errorMessage.value = result.error
    } else {
      successMessage.value = `${email.value}로 로그인 링크를 보냈습니다. 이메일을 확인해주세요! 📧`
    }
  } catch (error: any) {
    errorMessage.value = error.message || '알 수 없는 오류가 발생했습니다'
  } finally {
    loading.value = false
    currentAction.value = null
  }
}

const handleGoogleLogin = async () => {
  if (loading.value) return
  
  clearMessages()
  loading.value = true
  currentAction.value = 'google'
  
  try {
    const result = await authStore.signInWithGoogle()
    
    if (result.error) {
      errorMessage.value = result.error
      loading.value = false
      currentAction.value = null
    }
    // If successful, user will be redirected by OAuth flow
  } catch (error: any) {
    errorMessage.value = error.message || '구글 로그인 중 오류가 발생했습니다'
    loading.value = false
    currentAction.value = null
  }
}
</script>

<style scoped>
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.card-base {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 2rem;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-weight: 600;
  border-radius: 0.5rem;
  transition: all 0.2s;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.font-game {
  font-family: 'Comic Sans MS', cursive, sans-serif;
  font-weight: bold;
}
</style>