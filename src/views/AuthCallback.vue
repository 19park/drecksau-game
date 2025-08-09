<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
    <div class="text-center">
      <div v-if="loading" class="space-y-6">
        <div class="loading-spinner mx-auto w-16 h-16"></div>
        <h2 class="text-2xl font-semibold text-gray-800">로그인 처리 중...</h2>
        <p class="text-gray-600">잠시만 기다려주세요</p>
      </div>
      
      <div v-else-if="error" class="space-y-6">
        <div class="text-6xl">❌</div>
        <h2 class="text-2xl font-semibold text-red-600">로그인 실패</h2>
        <p class="text-gray-600 max-w-md mx-auto">{{ error }}</p>
        <router-link to="/login" class="btn-primary">
          다시 로그인하기
        </router-link>
      </div>
      
      <div v-else-if="success" class="space-y-6">
        <div class="text-6xl">✅</div>
        <h2 class="text-2xl font-semibold text-green-600">로그인 성공!</h2>
        <p class="text-gray-600">곧 게임 로비로 이동합니다...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const success = ref(false)

onMounted(async () => {
  try {
    console.log('🔑 Processing auth callback...')
    
    // Handle the auth callback
    const result = await authStore.handleAuthCallback()
    
    if (result.error) {
      console.error('❌ Auth callback error:', result.error)
      error.value = result.error
      loading.value = false
      return
    }
    
    console.log('✅ Auth callback successful')
    success.value = true
    loading.value = false
    
    // Wait a moment then redirect to lobby
    setTimeout(() => {
      router.push('/lobby')
    }, 2000)
    
  } catch (err: any) {
    console.error('❌ Unexpected error in auth callback:', err)
    error.value = err.message || '알 수 없는 오류가 발생했습니다'
    loading.value = false
  }
})
</script>

<style scoped>
.loading-spinner {
  border: 4px solid #f3f4f6;
  border-top: 4px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>