<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] text-center">
    <div class="mb-12 animate-bounce-soft">
      <span class="text-9xl">🐷</span>
    </div>
    
    <h1 class="game-title mb-8">
      Drecksau
    </h1>
    
    <p class="text-xl text-gray-600 mb-12 max-w-2xl">
      깨끗한 돼지들을 더럽게 만드는 실시간 멀티플레이어 보드게임!<br>
      친구들과 함께 진흙 속에서 뒹굴며 즐거운 시간을 보내세요.
    </p>
    
    <div class="flex flex-col sm:flex-row gap-4 mb-16">
      <router-link 
        v-if="!isAuthenticated" 
        to="/login" 
        class="btn-primary text-lg px-8 py-4"
      >
        게임 시작하기
      </router-link>
      
      <router-link 
        v-else 
        to="/lobby" 
        class="btn-primary text-lg px-8 py-4"
      >
        로비 입장하기
      </router-link>
      
      <button 
        @click="showRules = true" 
        class="btn-secondary text-lg px-8 py-4"
      >
        게임 규칙 보기
      </button>
    </div>
    
    <!-- Game Features -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
      <div class="card-base text-center">
        <div class="text-4xl mb-4">⚡</div>
        <h3 class="font-display text-xl font-semibold mb-2">실시간 플레이</h3>
        <p class="text-gray-600">최대 4명이 동시에 즐기는 실시간 멀티플레이어 게임</p>
      </div>
      
      <div class="card-base text-center">
        <div class="text-4xl mb-4">🎯</div>
        <h3 class="font-display text-xl font-semibold mb-2">전략적 플레이</h3>
        <p class="text-gray-600">다양한 카드를 활용한 치밀한 전략이 승부를 가른다</p>
      </div>
      
      <div class="card-base text-center">
        <div class="text-4xl mb-4">🏆</div>
        <h3 class="font-display text-xl font-semibold mb-2">토너먼트</h3>
        <p class="text-gray-600">확장판 규칙으로 토너먼트에 참가하여 최고를 가려보세요</p>
      </div>
    </div>
    
    <!-- Rules Modal -->
    <div v-if="showRules" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-2xl max-h-[80vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="font-display text-2xl font-bold">게임 규칙</h2>
            <button @click="showRules = false" class="text-gray-400 hover:text-gray-600">
              <span class="text-2xl">×</span>
            </button>
          </div>
          
          <div class="prose prose-gray max-w-none">
            <h3>🎯 게임 목표</h3>
            <p>가장 먼저 자신의 모든 돼지를 더럽게 만드는 플레이어가 승리합니다!</p>
            
            <h3>🎮 게임 진행</h3>
            <ol>
              <li>각 플레이어는 차례에 <strong>카드 1장 사용</strong> 또는 <strong>카드 1장 버리기</strong> 중 선택</li>
              <li>카드를 사용하거나 버린 후 덱에서 <strong>1장을 뽑아</strong> 3장을 유지</li>
              <li>사용할 카드가 없다면 손패 3장을 모두 버리고 새로 3장 뽑기 가능</li>
            </ol>
            
            <h3>🃏 주요 카드</h3>
            <ul>
              <li><strong>💩 진흙카드:</strong> 자신의 돼지를 더럽게 만듭니다</li>
              <li><strong>🏠 헛간카드:</strong> 돼지를 비로부터 보호합니다</li>
              <li><strong>🛁 목욕카드:</strong> 상대방의 더러운 돼지를 깨끗하게 만듭니다</li>
              <li><strong>🌧️ 비카드:</strong> 헛간 밖의 모든 더러운 돼지를 깨끗하게 만듭니다</li>
              <li><strong>⚡ 벼락카드:</strong> 상대방의 헛간을 태워버립니다</li>
              <li><strong>🔌 피뢰침카드:</strong> 헛간을 벼락으로부터 보호합니다</li>
              <li><strong>🔒 헛간잠금카드:</strong> 헛간 안의 돼지가 목욕당하는 것을 방지합니다</li>
            </ul>
            
            <h3>🎲 특수 상황</h3>
            <p><strong>피뢰침이 있는 잠긴 헛간의 더러운 돼지</strong>는 게임이 끝날 때까지 절대 무적 상태가 됩니다!</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const showRules = ref(false)

const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>