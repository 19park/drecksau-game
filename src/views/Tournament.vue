<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-game text-4xl text-primary-600 flex items-center gap-3">
          <span class="text-5xl">🏆</span>
          토너먼트
        </h1>
        <p class="text-gray-600 mt-2">확장판 규칙으로 진행되는 토너먼트에 참가해보세요!</p>
      </div>
      
      <button 
        @click="showCreateTournament = true"
        class="btn-primary"
      >
        <span class="text-xl mr-2">🏅</span>
        토너먼트 만들기
      </button>
    </div>

    <!-- Tournament Status -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card-base text-center">
        <div class="text-3xl mb-2">🏆</div>
        <div class="text-2xl font-bold text-primary-600">5</div>
        <div class="text-gray-600">총 토너먼트</div>
      </div>
      
      <div class="card-base text-center">
        <div class="text-3xl mb-2">🎮</div>
        <div class="text-2xl font-bold text-green-600">2</div>
        <div class="text-gray-600">진행 중</div>
      </div>
      
      <div class="card-base text-center">
        <div class="text-3xl mb-2">⏳</div>
        <div class="text-2xl font-bold text-secondary-600">1</div>
        <div class="text-gray-600">대기 중</div>
      </div>
      
      <div class="card-base text-center">
        <div class="text-3xl mb-2">👑</div>
        <div class="text-2xl font-bold text-mud-600">0</div>
        <div class="text-gray-600">내 우승 횟수</div>
      </div>
    </div>

    <!-- Tournament List -->
    <div class="card-base">
      <h2 class="font-display text-xl font-semibold mb-6">토너먼트 목록</h2>
      
      <!-- Coming Soon Message -->
      <div class="text-center py-12">
        <div class="text-8xl mb-6">🚧</div>
        <h3 class="text-2xl font-semibold text-gray-800 mb-4">토너먼트 기능 준비 중</h3>
        <p class="text-gray-600 mb-6 max-w-2xl mx-auto">
          확장판 "아름다운 돼지" 규칙을 적용한 토너먼트 시스템을 개발하고 있습니다. 
          곧 더욱 흥미진진한 경쟁을 즐기실 수 있습니다!
        </p>
        
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-6 max-w-xl mx-auto">
          <h4 class="font-semibold text-purple-800 mb-3">토너먼트 미리보기</h4>
          <ul class="text-sm text-purple-700 space-y-2 text-left">
            <li>🎯 라운드별 승부 시스템</li>
            <li>🏅 양동이 토큰 vs 트로피 토큰 수집</li>
            <li>💄 아름다운 돼지 확장 규칙 적용</li>
            <li>📊 토너먼트 순위표 및 통계</li>
            <li>🎉 시즌별 챔피언 시스템</li>
          </ul>
        </div>
        
        <div class="mt-8">
          <router-link to="/lobby" class="btn-primary mr-4">
            일반 게임 즐기기
          </router-link>
          <button 
            @click="showTournamentPreview = true"
            class="btn-secondary"
          >
            토너먼트 룰 미리보기
          </button>
        </div>
      </div>
    </div>

    <!-- Tournament Preview Modal -->
    <div v-if="showTournamentPreview" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-3xl max-h-[80vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="font-display text-2xl font-bold text-purple-800">🏆 토너먼트 규칙 (확장판)</h2>
            <button @click="showTournamentPreview = false" class="text-gray-400 hover:text-gray-600">
              <span class="text-2xl">×</span>
            </button>
          </div>
          
          <div class="prose prose-purple max-w-none">
            <h3>🎮 토너먼트 개요</h3>
            <p>
              농부 아저씨는 시장에서 열리는 "가장 아름다운 돼지" 경연대회에 참가하려고 합니다. 
              이 확장 규칙을 적용하면 기본 게임보다 더 복잡하고 재미있는 상황이 벌어집니다.
            </p>
            
            <h3>🎯 승리 조건</h3>
            <ul>
              <li><strong>더러운 돼지 승리:</strong> 모든 돼지를 더럽게 만들어 양동이 토큰 획득</li>
              <li><strong>아름다운 돼지 승리:</strong> 모든 돼지를 아름답게 만들어 트로피 토큰 획득</li>
            </ul>
            
            <h3>🃏 새로운 카드들</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div class="border rounded-lg p-4">
                <div class="text-2xl mb-2">💄</div>
                <h4 class="font-semibold">아름다운 돼지</h4>
                <p class="text-sm">돼지를 아름답게 만듭니다. 우산이 있어서 비에 젖지 않습니다.</p>
              </div>
              <div class="border rounded-lg p-4">
                <div class="text-2xl mb-2">🏃</div>
                <h4 class="font-semibold">도망 카드</h4>
                <p class="text-sm">아름다운 돼지 카드를 제거합니다.</p>
              </div>
              <div class="border rounded-lg p-4">
                <div class="text-2xl mb-2">🐦</div>
                <h4 class="font-semibold">행운의 새</h4>
                <p class="text-sm">손의 모든 카드를 즉시 사용합니다.</p>
              </div>
            </div>
            
            <h3>🏅 토큰 시스템</h3>
            <div class="grid grid-cols-2 gap-4 my-6">
              <div class="border rounded-lg p-4 text-center">
                <div class="text-3xl mb-2">🪣</div>
                <h4 class="font-semibold text-mud-600">양동이 토큰</h4>
                <p class="text-sm">더러운 돼지로 승리시 획득<br>당근 1~3개 (1~3점)</p>
              </div>
              <div class="border rounded-lg p-4 text-center">
                <div class="text-3xl mb-2">🏆</div>
                <h4 class="font-semibold text-purple-600">트로피 토큰</h4>
                <p class="text-sm">아름다운 돼지로 승리시 획득<br>별 1~3개 (1~3점)</p>
              </div>
            </div>
            
            <h3>🎊 토너먼트 진행</h3>
            <ol>
              <li>라운드별로 게임을 진행합니다 (최소 3라운드, 최대 5라운드)</li>
              <li>각 라운드 승자는 승리 방식에 따라 토큰을 획득합니다</li>
              <li>한 종류의 토큰이 모두 소진되면 토너먼트가 종료됩니다</li>
              <li>최종 점수가 가장 높은 플레이어가 토너먼트 우승자가 됩니다</li>
              <li>동점일 경우 최종 결승 라운드를 진행합니다</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Tournament Modal (Placeholder) -->
    <div v-if="showCreateTournament" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-md w-full p-6">
        <div class="text-center">
          <div class="text-6xl mb-4">🚧</div>
          <h3 class="text-xl font-semibold text-gray-800 mb-4">토너먼트 생성 기능 준비 중</h3>
          <p class="text-gray-600 mb-6">곧 토너먼트를 생성하고 참가할 수 있습니다!</p>
          <button 
            @click="showCreateTournament = false"
            class="btn-primary"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showCreateTournament = ref(false)
const showTournamentPreview = ref(false)
</script>