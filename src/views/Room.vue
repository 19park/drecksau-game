<template>
  <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div class="loading-spinner mx-auto mb-4"></div>
      <p class="text-gray-600">게임방을 불러오는 중...</p>
    </div>
  </div>

  <div v-else-if="error" class="text-center py-12">
    <div class="text-6xl mb-4">😞</div>
    <h2 class="text-xl font-semibold text-gray-800 mb-2">게임방을 찾을 수 없습니다</h2>
    <p class="text-gray-600 mb-6">{{ error }}</p>
    <router-link to="/lobby" class="btn-primary">
      로비로 돌아가기
    </router-link>
  </div>

  <div v-else-if="roomsStore.currentRoom" class="space-y-6">
    <!-- Room Header -->
    <div class="card-base">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h1 class="font-game text-3xl text-primary-600">{{ roomsStore.currentRoom?.name }}</h1>
            <span v-if="roomsStore.currentRoom?.is_expansion" class="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              확장판
            </span>
          </div>
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span>👥 {{ roomsStore.roomPlayers.length }}/{{ roomsStore.currentRoom?.max_players }} 명</span>
            <span>🎯 {{ roomsStore.currentRoom?.status === 'waiting' ? '대기 중' : '게임 중' }}</span>
            <span v-if="isRoomCreator">👑 방장</span>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            @click="leaveRoom"
            class="text-red-500 hover:text-red-700 font-medium"
          >
            🚪 나가기
          </button>
        </div>
      </div>
    </div>

    <!-- Players -->
    <div class="card-base">
      <h2 class="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <span class="text-2xl">👥</span>
        플레이어
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="player in sortedPlayers" 
          :key="player.id"
          class="border rounded-lg p-4 transition-all duration-200"
          :class="{
            'border-primary-200 bg-primary-50': player.player_id === user?.id,
            'border-green-200 bg-green-50': player.is_ready,
            'border-gray-200': !player.is_ready && player.player_id !== user?.id
          }"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="text-2xl">
                {{ getPlayerEmoji(player.player_order) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">
                    {{ getPlayerName(player) }}
                  </span>
                  <span v-if="roomsStore.currentRoom?.creator_id === player.player_id" class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    방장
                  </span>
                  <span v-if="player.player_id === user?.id" class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    나
                  </span>
                </div>
                <div class="text-sm text-gray-600">
                  플레이어 {{ player.player_order }}
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <div 
                class="w-3 h-3 rounded-full"
                :class="{
                  'bg-green-500': player.is_ready,
                  'bg-gray-400': !player.is_ready
                }"
                :title="player.is_ready ? '준비됨' : '준비 안됨'"
              ></div>
              <span class="text-sm font-medium">
                {{ player.is_ready ? '준비됨' : '준비 중' }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Empty slots -->
        <div 
          v-for="slot in emptySlots" 
          :key="`empty-${slot}`"
          class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500"
        >
          <div class="text-2xl mb-2">👻</div>
          <div class="text-sm">플레이어 대기 중...</div>
        </div>
      </div>
    </div>

    <!-- Debug Panel (개발용) -->
    <div class="card-base bg-yellow-50 border-yellow-200" v-if="isDev">
      <h3 class="text-sm font-bold mb-2">🐛 디버그 정보</h3>
      <div class="text-xs space-y-1">
        <div>현재 플레이어: {{ currentPlayer?.player_id?.slice(0, 8) || 'null' }}</div>
        <div>방장 여부: {{ isRoomCreator }}</div>
        <div>플레이어 수: {{ roomsStore.roomPlayers.length }}</div>
        <div>모두 준비: {{ allPlayersReady }}</div>
        <div>방 상태: {{ roomsStore.currentRoom?.status }}</div>
        <div>게임 시작 가능: {{ canStartGame }}</div>
      </div>
    </div>

    <!-- Game Controls -->
    <div class="card-base">
      <h2 class="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <span class="text-2xl">🎮</span>
        게임 설정
      </h2>
      
      <div class="space-y-4">
        <!-- Ready Button -->
        <div v-if="currentPlayer && roomsStore.currentRoom?.status === 'waiting'">
          <button 
            @click="toggleReady"
            :disabled="loading"
            class="w-full py-3 px-6 rounded-lg font-semibold transition-colors"
            :class="{
              'bg-green-500 hover:bg-green-600 text-white': currentPlayer.is_ready,
              'bg-gray-500 hover:bg-gray-600 text-white': !currentPlayer.is_ready
            }"
          >
            <span v-if="loading" class="loading-spinner mr-2"></span>
            {{ currentPlayer.is_ready ? '✅ 준비 완료' : '⏳ 준비하기' }}
          </button>
        </div>
        
        <!-- Start Game Button -->
        <div v-if="isRoomCreator && roomsStore.currentRoom?.status === 'waiting'">
          <button 
            @click="startGame"
            :disabled="!canStartGame || loading"
            class="w-full btn-primary py-3"
            :class="{
              'opacity-50 cursor-not-allowed': !canStartGame
            }"
          >
            <span v-if="loading" class="loading-spinner mr-2"></span>
            🚀 게임 시작하기
          </button>
          
          <div v-if="!canStartGame" class="mt-2 text-sm text-gray-600 text-center">
            <div v-if="roomsStore.roomPlayers.length < 2">
              ⚠️ 최소 2명의 플레이어가 필요합니다
            </div>
            <div v-else-if="!allPlayersReady">
              ⚠️ 모든 플레이어가 준비되어야 합니다
            </div>
          </div>
        </div>
        
        <!-- Game in Progress -->
        <div v-if="roomsStore.currentRoom?.status === 'playing'" class="text-center">
          <div class="text-4xl mb-4">🎮</div>
          <h3 class="text-xl font-semibold text-green-600 mb-2">게임 진행 중</h3>
          <p class="text-gray-600 mb-4">게임이 시작되었습니다!</p>
          <router-link 
            :to="`/game/${roomsStore.currentRoom?.id}`"
            class="btn-primary"
          >
            게임 입장하기
          </router-link>
        </div>
      </div>
    </div>

    <!-- Game Rules (Collapsible) -->
    <div class="card-base">
      <button 
        @click="showRules = !showRules"
        class="w-full flex items-center justify-between text-left"
      >
        <h2 class="font-display text-xl font-semibold flex items-center gap-2">
          <span class="text-2xl">📜</span>
          게임 규칙
        </h2>
        <span class="text-2xl transform transition-transform" :class="{ 'rotate-180': showRules }">
          ⌄
        </span>
      </button>
      
      <div v-if="showRules" class="mt-4 prose prose-sm max-w-none">
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
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoomsStore } from '@/stores/rooms'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'

const route = useRoute()
const router = useRouter()
const roomsStore = useRoomsStore()
const authStore = useAuthStore()
const gameStore = useGameStore()

// Reactive refs
const showRules = ref(false)

// Props
const roomId = route.params.id as string

// Store reactive references
const loading = computed(() => roomsStore.loading)
const error = computed(() => roomsStore.error)
const isRoomCreator = computed(() => roomsStore.isRoomCreator)
const currentPlayer = computed(() => roomsStore.currentPlayer)
const canStartGame = computed(() => roomsStore.canStartGame)

const user = computed(() => authStore.user)
const isDev = computed(() => import.meta.env.DEV)

const sortedPlayers = computed(() => 
  [...roomsStore.roomPlayers].sort((a, b) => a.player_order - b.player_order)
)

const emptySlots = computed(() => {
  const currentSlots = roomsStore.currentRoom?.max_players || 4
  const filledSlots = roomsStore.roomPlayers.length
  return Array.from({ length: Math.max(0, currentSlots - filledSlots) }, (_, i) => i + filledSlots + 1)
})

const allPlayersReady = computed(() => 
  roomsStore.roomPlayers.every((player: any) => player.is_ready)
)

// Methods
const getPlayerEmoji = (order: number) => {
  const emojis = ['🐷', '🐸', '🐵', '🐻']
  return emojis[order - 1] || '👤'
}

const getPlayerName = (player: any) => {
  return player.profile?.email?.split('@')[0] || `플레이어 ${player.player_order}`
}

const leaveRoom = async () => {
  if (confirm('정말로 게임방을 나가시겠습니까?')) {
    const result = await roomsStore.leaveRoom()
    if (!result.error) {
      router.push('/lobby')
    }
  }
}

const toggleReady = async () => {
  await roomsStore.toggleReady()
}

const startGame = async () => {
  if (!canStartGame.value) {
    console.log('❌ Cannot start game. Conditions not met:', {
      canStartGame: canStartGame.value,
      isRoomCreator: isRoomCreator.value,
      playerCount: roomsStore.roomPlayers.length,
      allReady: roomsStore.roomPlayers.every(p => p.is_ready)
    })
    return
  }
  
  try {
    console.log('🚀 Starting game for room:', roomId)
    
    // Start the room's game state
    const roomResult = await roomsStore.startGame()
    if (roomResult.error) {
      console.error('Failed to start room game:', roomResult.error)
      return
    }
    
    // Initialize the actual game (pigs, cards, etc.)
    const gameResult = await gameStore.initializeGame(roomId as string)
    if (gameResult.error) {
      console.error('Failed to initialize game:', gameResult.error)
      return
    }
    
    console.log('✅ Game started and initialized successfully')
    
    // Navigate to game view
    router.push(`/game/${roomId}`)
    
  } catch (err) {
    console.error('Error starting game:', err)
  }
}

// Handle page unload for room
const handleBeforeUnloadRoom = (event: BeforeUnloadEvent): string | undefined => {
  // Show confirmation if user is the room creator and game hasn't started
  if (isRoomCreator.value && roomsStore.currentRoom?.status === 'waiting' && roomsStore.roomPlayers.length > 1) {
    event.preventDefault()
    const message = '당신이 방장입니다. 나가면 다른 플레이어들이 방에서 나가게 됩니다. 정말로 나가시겠습니까?'
    // Modern way to show confirmation dialog
    event.returnValue = message
    return message
  }
  return undefined
}

const handleUnloadRoom = () => {
  // Optionally leave the room when closing
  if (roomsStore.currentRoom && roomsStore.currentPlayer) {
    try {
      console.log('🚪 Auto-leaving room due to page unload')
      // Don't wait for the result as the page is closing
      roomsStore.leaveRoom()
    } catch (err) {
      console.error('Error leaving room during unload:', err)
    }
  }
}

// Lifecycle
onMounted(async () => {
  if (roomId) {
    console.log('🔄 Room.vue mounting, loading room:', roomId)
    await roomsStore.loadRoom(roomId)
    
    // Debug current state after loading
    console.log('🔍 Room loaded. Current state:', {
      currentRoom: roomsStore.currentRoom?.name,
      playerCount: roomsStore.roomPlayers.length,
      currentPlayer: currentPlayer.value?.player_id?.slice(0, 8),
      isRoomCreator: isRoomCreator.value,
      canStartGame: canStartGame.value
    })
    
    // Add page unload event listeners
    window.addEventListener('beforeunload', handleBeforeUnloadRoom)
    window.addEventListener('unload', handleUnloadRoom)
  } else {
    router.push('/lobby')
  }
})

onUnmounted(() => {
  // Remove event listeners
  window.removeEventListener('beforeunload', handleBeforeUnloadRoom)
  window.removeEventListener('unload', handleUnloadRoom)
  
  roomsStore.stopRoomSubscription()
})
</script>