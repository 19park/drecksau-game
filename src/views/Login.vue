<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh]">
    <div class="card-base max-w-md w-full">
      <div class="text-center mb-8">
        <span class="text-6xl">🐷</span>
        <h1 class="font-game text-3xl text-primary-600 mt-4">로그인</h1>
        <p class="text-gray-600 mt-2">드렉사우 게임에 참가하세요!</p>
      </div>
      
      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>
        
        <div v-if="error" class="text-red-500 text-sm">
          {{ error }}
        </div>
        
        <button
          type="submit"
          :disabled="loading"
          class="w-full btn-primary"
        >
          <span v-if="loading" class="loading-spinner mr-2"></span>
          {{ loading ? '로그인 중...' : '로그인' }}
        </button>
      </form>
      
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>
        
        <div class="mt-6 space-y-3">
          <button
            @click="handleMagicLink"
            :disabled="!email || loading"
            class="w-full btn-secondary"
          >
            <span v-if="loadingMagic" class="loading-spinner mr-2"></span>
            {{ loadingMagic ? '전송 중...' : '매직 링크로 로그인' }}
          </button>
          
          <button
            @click="toggleMode"
            class="w-full text-primary-600 hover:text-primary-800 font-medium"
          >
            {{ isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인' }}
          </button>
        </div>
      </div>
      
      <!-- Success Message -->
      <div v-if="successMessage" class="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const successMessage = ref('')
const loading = ref(false)
const loadingMagic = ref(false)
const isLoginMode = ref(true)

const handleLogin = async () => {
  error.value = ''
  
  if (!email.value || !password.value) {
    error.value = '이메일과 비밀번호를 입력해주세요.'
    return
  }
  
  const result = isLoginMode.value 
    ? await authStore.signIn(email.value, password.value)
    : await authStore.signUp(email.value, password.value)
  
  if (result.error) {
    error.value = result.error
  } else if (!isLoginMode.value) {
    successMessage.value = '회원가입이 완료되었습니다! 이메일을 확인해주세요.'
  }
}

const handleMagicLink = async () => {
  error.value = ''
  
  if (!email.value) {
    error.value = '이메일을 입력해주세요.'
    return
  }
  
  loadingMagic.value = true
  
  const result = await authStore.signInWithMagicLink(email.value)
  
  if (result.error) {
    error.value = result.error
  } else {
    successMessage.value = '매직 링크를 이메일로 전송했습니다! 이메일을 확인해주세요.'
  }
  
  loadingMagic.value = false
}

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  error.value = ''
  successMessage.value = ''
}
</script>