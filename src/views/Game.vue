<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
    <!-- Game Header -->
    <div class="bg-white/90 backdrop-blur-sm shadow-game sticky top-0 z-40">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="font-game text-2xl text-primary-600">{{ roomsStore.currentRoom?.name || '게임' }}</h1>
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <span>🎮 게임 중</span>
              <span>•</span>
              <span>덱: {{ deckRemaining }}장</span>
              <span>•</span>
              <span :class="{ 
                'text-green-600': gameStore.isConnected, 
                'text-red-600': !gameStore.isConnected && !gameStore.loading,
                'text-yellow-600': gameStore.loading
              }">
                {{ gameStore.isConnected ? '🟢 연결됨' : (gameStore.loading ? '🟡 연결중' : '🔴 연결 끊김') }}
              </span>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <button 
              @click="showGameMenu = !showGameMenu"
              class="text-gray-600 hover:text-gray-800 p-2"
            >
              ⚙️
            </button>
            
            <!-- Game Menu Dropdown -->
            <div v-if="showGameMenu" class="absolute top-full right-4 mt-2 bg-white rounded-lg shadow-lg border p-2 min-w-[160px]">
              <button @click="showRules = true; showGameMenu = false" class="w-full text-left px-3 py-2 hover:bg-gray-100 rounded">
                📜 게임 규칙
              </button>
              <button @click="confirmLeaveGame" class="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-red-600">
                🚪 게임 나가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-6">
      <div v-if="gameStore.loading" class="flex items-center justify-center min-h-[60vh]">
        <div class="text-center">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-gray-600">게임을 불러오는 중...</p>
        </div>
      </div>

      <div v-else-if="gameStore.error" class="text-center py-12">
        <div class="text-6xl mb-4">😞</div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">게임을 불러올 수 없습니다</h2>
        <p class="text-gray-600 mb-6">{{ gameStore.error }}</p>
        
        <div class="space-y-3">
          <button 
            @click="retryConnection" 
            class="btn-secondary mr-3"
            :disabled="gameStore.loading"
          >
            <span v-if="gameStore.loading" class="loading-spinner mr-2"></span>
            🔄 다시 연결하기
          </button>
          <router-link to="/lobby" class="btn-primary">
            🏠 로비로 돌아가기
          </router-link>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Debug Panel (개발용) -->
        <div v-if="isDev" class="card-base bg-yellow-50 border-yellow-200">
          <h3 class="text-sm font-bold mb-2">🐛 게임 디버그 정보</h3>
          <div class="text-xs space-y-2">
            <div>
              <strong>내 돼지:</strong> {{ gameStore.myPigs.map(p => `${p.pig_state}${p.has_barn?'🏠':''}${p.has_lightning_rod?'⚡':''}${p.barn_locked?'🔒':''}(${p.id.slice(0, 4)})`).join(', ') }}
            </div>
            <div>
              <strong>상대 돼지:</strong> {{ gameStore.otherPlayersPigs.map(p => `${p.pig_state}${p.has_barn?'🏠':''}${p.has_lightning_rod?'⚡':''}${p.barn_locked?'🔒':''}(${p.player_id.slice(0, 4)}-${p.id.slice(0, 4)})`).join(', ') }}
            </div>
            <div>
              <strong>목욕가능 상대돼지:</strong> {{ gameStore.otherPlayersPigs.filter(p => p.pig_state === 'dirty' && (!p.has_barn || !p.barn_locked)).length }}마리
            </div>
            <div>
              <strong>목욕카드 사용 가능:</strong> {{ gameStore.canPlayCard('bath') }}
            </div>
            <div>
              <strong>현재 턴:</strong> {{ gameStore.isMyTurn ? '내 턴' : '상대 턴' }}
            </div>
            <div>
              <strong>턴 진행중:</strong> {{ gameStore.turnInProgress }}
            </div>
            <div>
              <strong>내 손패:</strong> {{ gameStore.myHand.map(h => `${h.card_type}(${h.card_count})`).join(', ') }}
            </div>
            <div>
              <strong>카드 사용 가능:</strong> {{ gameStore.myHand.filter(h => h.card_count > 0).map(h => `${h.card_type}: ${gameStore.canPlayCard(h.card_type) ? '✅' : '❌'}`).join(', ') }}
            </div>
            <div v-if="gameStore.myHand.some(h => h.card_type === 'barn_lock' && h.card_count > 0)">
              <strong>헛간잠금카드 조건:</strong> 내 더러운 돼지 + 헛간 + 미잠금: {{ gameStore.myPigs.filter(p => p.has_barn && p.pig_state === 'dirty' && !p.barn_locked).length }}마리
            </div>
            <div v-if="gameStore.myHand.some(h => h.card_type === 'lightning_rod' && h.card_count > 0)">
              <strong>피뢰침카드 조건:</strong> 내 헛간 돼지 + 피뢰침 없음: {{ gameStore.myPigs.filter(p => p.has_barn && !p.has_lightning_rod).length }}마리
            </div>
          </div>
        </div>

        <!-- Game Board Layout -->
        <div class="grid grid-cols-12 gap-6">
          <!-- Other Players (Top/Sides) -->
          <div class="col-span-12">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div 
                v-for="player in otherPlayers" 
                :key="player.player_id"
                class="card-base p-4"
                :class="{
                  'ring-2 ring-primary-400 bg-primary-50': isCurrentPlayer(player.player_order),
                  'opacity-75': !isCurrentPlayer(player.player_order)
                }"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">{{ getPlayerEmoji(player.player_order) }}</span>
                    <span class="font-medium">{{ getPlayerNameFromPlayer(player) }}</span>
                    <span v-if="isCurrentPlayer(player.player_order)" class="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                      턴
                    </span>
                  </div>
                  <div class="text-sm text-gray-600">
                    🃏 {{ getPlayerHandCount() }}장
                  </div>
                </div>
                
                <!-- Player's Pigs -->
                <div class="flex gap-2">
                  <PigCard
                    v-for="pig in getPlayerPigs(player.player_id)" 
                    :key="pig.id"
                    :pig="pig"
                    :show-info="true"
                    :disabled="true"
                    size="small"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Central Game Area -->
          <div class="col-span-12 md:col-span-8">
            <!-- Deck and Discard -->
            <div class="flex justify-center gap-8 mb-6">
              <div class="text-center">
                <div class="w-20 h-28 bg-primary-500 rounded-lg flex items-center justify-center text-white text-2xl">
                  🃏
                </div>
                <div class="text-sm text-gray-600 mt-1">덱 ({{ deckRemaining }})</div>
                <div class="text-xs text-gray-500 mt-1">자동으로 뽑기</div>
              </div>
              
              <div class="text-center">
                <div class="w-20 h-28 bg-gray-300 rounded-lg flex items-center justify-center text-gray-600 text-2xl">
                  🗑️
                </div>
                <div class="text-sm text-gray-600 mt-1">버린카드</div>
              </div>
            </div>
            
            <!-- Turn Indicator -->
            <div class="text-center mb-6">
              <div v-if="gameStore.isGameFinished" class="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-full">
                <span class="text-xl">🏁</span>
                <span class="font-semibold">게임 종료 - {{ gameStore.winnerInfo?.name }}님 승리!</span>
              </div>
              <div v-else-if="gameStore.cardExecutionInProgress" class="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full animate-pulse">
                <span class="text-xl">🚫</span>
                <span class="font-semibold">카드 실행 중...</span>
              </div>
              <div v-else-if="gameStore.turnInProgress" class="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full animate-pulse">
                <span class="text-xl">⚡</span>
                <span class="font-semibold">턴 진행 중...</span>
              </div>
              <div v-else-if="gameStore.isMyTurn" class="inline-flex items-center gap-2 bg-primary-100 text-primary-800 px-4 py-2 rounded-full">
                <span class="text-xl">🎯</span>
                <span class="font-semibold">당신의 차례입니다!</span>
              </div>
              <div v-else class="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-full">
                <span class="text-xl">⏳</span>
                <span>{{ getCurrentPlayerName() }}의 차례</span>
              </div>
              
              <!-- Action Feedback -->
              <div 
                v-if="gameStore.showCardEffect && gameStore.lastAction" 
                class="mt-3 inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full animate-pulse"
              >
                <span class="text-xl">✨</span>
                <span class="font-semibold">{{ gameStore.lastAction }}</span>
              </div>
            </div>
          </div>

          <!-- Game Actions Panel -->
          <div class="col-span-12 md:col-span-4">
            <div class="card-base">
              <h3 class="font-semibold mb-3">게임 액션</h3>
              
              <div class="space-y-2">
                <!-- Single Card Discard - Primary action when no playable cards -->
                <button 
                  v-if="gameStore.isMyTurn && !gameStore.isGameFinished && !hasAnyPlayableCard"
                  @click="showDiscardSelector = true" 
                  class="w-full btn-warning animate-pulse text-sm py-2"
                  :disabled="!canDiscardAll || gameStore.turnInProgress || gameStore.cardExecutionInProgress"
                >
                  ⚠️ 사용 불가! 카드 1장 버리기
                </button>
                
                <!-- Regular Single Card Discard -->
                <button 
                  v-if="gameStore.isMyTurn && !gameStore.isGameFinished && hasAnyPlayableCard"
                  @click="showDiscardSelector = true" 
                  class="w-full btn-secondary text-sm py-2"
                  :disabled="!canDiscardAll || gameStore.turnInProgress || gameStore.cardExecutionInProgress"
                >
                  🗂️ 카드 1장 버리기
                </button>
                
                <!-- Discard All Cards - Only when no cards can be played -->
                <button 
                  v-if="gameStore.canDiscardAllCards"
                  @click="handleDiscardAllCards" 
                  class="w-full btn-primary text-sm py-2 bg-yellow-500 hover:bg-yellow-600"
                  :disabled="gameStore.turnInProgress || gameStore.cardExecutionInProgress"
                >
                  🗑️ 모든 카드 공개 후 버리기
                </button>
                
                <button 
                  v-if="!gameStore.isGameFinished"
                  @click="handleEndTurn" 
                  class="w-full btn-mud text-sm py-2"
                  :disabled="!gameStore.isMyTurn || gameStore.turnInProgress || gameStore.cardExecutionInProgress"
                >
                  ⏭️ 턴 종료
                </button>
                
                <div v-if="gameStore.isGameFinished" class="text-center text-gray-500 py-4">
                  게임이 종료되었습니다
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- My Player Area (Bottom) -->
        <div class="card-base p-6 bg-gradient-to-r from-primary-50 to-secondary-50">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-3xl">{{ getPlayerEmoji(myPlayerOrder) }}</span>
              <div>
                <div class="font-semibold">{{ user?.email?.split('@')[0] || '나' }}</div>
                <div class="text-sm text-gray-600">플레이어 {{ myPlayerOrder }}</div>
              </div>
            </div>
            
            <div v-if="gameStore.isMyTurn" class="flex items-center gap-2 text-primary-600">
              <span class="animate-pulse">🎯</span>
              <span class="font-semibold">내 턴!</span>
            </div>
          </div>
          
          <!-- My Pigs -->
          <div class="flex justify-center gap-6 mb-6">
            <PigCard
              v-for="pig in gameStore.myPigs" 
              :key="pig.id"
              :pig="pig"
              :show-info="true"
              size="large"
              @click="(pig) => console.log('Selected pig:', pig)"
            />
          </div>
          
          <!-- My Hand -->
          <div>
            <h4 class="font-semibold mb-3 text-center">내 손패</h4>
            <div class="flex justify-center gap-3 flex-wrap">
              <GameCard
                v-for="card in gameStore.myHand.filter(c => c.card_count > 0)" 
                :key="card.card_type"
                :card-type="card.card_type"
                :count="card.card_count"
                :playable="gameStore.canPlayCard(card.card_type) && gameStore.isMyTurn && !gameStore.turnInProgress && !gameStore.cardExecutionInProgress && !gameStore.isGameFinished"
                :disabled="!gameStore.isMyTurn || gameStore.turnInProgress || gameStore.cardExecutionInProgress || gameStore.isGameFinished"
                :highlighted="gameStore.canPlayCard(card.card_type) && gameStore.isMyTurn && !gameStore.turnInProgress && !gameStore.cardExecutionInProgress && !gameStore.isGameFinished"
                @play="handleCardPlay"
                @click="(cardType) => console.log('Selected card:', cardType)"
              />
              
              <div v-if="gameStore.myHand.filter(c => c.card_count > 0).length === 0" class="text-gray-500 text-center py-8">
                손패가 비어있습니다
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Rules Modal -->
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
            <p><strong>돼지들을 더럽게 만들어야 합니다!</strong> 가장 먼저 자신의 앞에 있는 돼지 카드를 모두 진흙 목욕 중인 돼지 면으로 만들면 승리합니다.</p>
            
            <h3>🎮 게임 진행</h3>
            <ol>
              <li>각 턴마다 <strong>카드 1장 사용</strong> 또는 <strong>카드 1장 버리기</strong> 중 하나를 선택합니다</li>
              <li>카드를 사용하거나 버린 후 덱에서 <strong>카드 1장을 뽑아</strong> 손패 3장을 유지합니다</li>
              <li><strong>한 번에 카드는 1장만</strong> 사용할 수 있습니다</li>
              <li>손패로 할 수 있는 일이 없다면 모든 카드를 버리고 새로 3장 뽑을 수 있습니다</li>
            </ol>
            
            <h3>🏆 승리 조건</h3>
            <p><strong>한 사람이 자신의 돼지 모두를 더러운 돼지로 만들면 게임에서 즉시 승리</strong>합니다.</p>
            
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
          </div>
        </div>
      </div>
    </div>

    <!-- Target Selector Modal -->
    <TargetSelector
      v-if="showTargetSelector && !isTargetSelectionInProgress && !gameStore.cardExecutionInProgress"
      :show="showTargetSelector"
      :card-type="pendingCardPlay || undefined"
      :targets="availableTargets"
      @select="selectTarget"
      @cancel="closeTargetSelector"
    />

    <!-- Card Discard Selector Modal -->
    <CardDiscardSelector
      v-if="showDiscardSelector"
      :show="showDiscardSelector"
      :available-cards="gameStore.myHand.filter(c => c.card_count > 0)"
      @select="handleDiscardCard"
      @cancel="closeDiscardSelector"
    />

    <!-- Game Finished Modal - Winner -->
    <div v-if="gameStore.isGameFinished && gameStore.isWinner" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full text-center p-8">
        <div class="text-8xl mb-6">🏆</div>
        <h2 class="font-display text-3xl font-bold text-yellow-600 mb-4">축하합니다!</h2>
        <p class="text-lg text-gray-700 mb-6">
          <span v-if="gameStore.winConditionType === 'dirty'">
            🐷 모든 돼지를 더럽게 만드셨습니다!<br>
            <span class="text-mud-600 font-semibold">"드렉사우!" 게임 승리!</span>
          </span>
          <span v-else-if="gameStore.winConditionType === 'beautiful'">
            💄 모든 돼지를 아름답게 만드셨습니다!<br>
            <span class="text-purple-600 font-semibold">확장판 규칙 승리!</span>
          </span>
        </p>
        
        <div class="space-y-3">
          <button 
            @click="router.push('/lobby')"
            class="w-full btn-primary"
          >
            🏠 로비로 돌아가기
          </button>
          <button 
            @click="router.push(`/room/${roomId}`)"
            class="w-full btn-secondary"
          >
            🔄 다시 게임하기
          </button>
        </div>
      </div>
    </div>

    <!-- Game Finished Modal - Loser -->
    <div v-if="gameStore.isGameFinished && !gameStore.isWinner" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full text-center p-8">
        <div class="text-8xl mb-6">😞</div>
        <h2 class="font-display text-3xl font-bold text-gray-600 mb-4">게임 종료</h2>
        <p class="text-lg text-gray-700 mb-6">
          <span class="text-purple-600 font-semibold">{{ gameStore.winnerInfo?.name }}님이 승리했습니다!</span><br>
          다음 게임에서 승리하세요!
        </p>
        
        <div class="space-y-3">
          <button 
            @click="router.push('/lobby')"
            class="w-full btn-primary"
          >
            🏠 로비로 돌아가기
          </button>
          <button 
            @click="router.push(`/room/${roomId}`)"
            class="w-full btn-secondary"
          >
            🔄 다시 게임하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useRoomsStore } from '@/stores/rooms'
import { useAuthStore } from '@/stores/auth'
import { useGameLogic } from '@/composables/useGameLogic'
import GameCard from '@/components/GameCard.vue'
import PigCard from '@/components/PigCard.vue'
import TargetSelector from '@/components/TargetSelector.vue'
import CardDiscardSelector from '@/components/CardDiscardSelector.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const roomsStore = useRoomsStore()
const authStore = useAuthStore()

const {
  showTargetSelector,
  availableTargets,
  pendingCardPlay,
  isTargetSelectionInProgress,
  initiateCardPlay,
  selectTarget,
  closeTargetSelector,
  getCurrentPlayerName
} = useGameLogic()

// Reactive state
const showGameMenu = ref(false)
const showRules = ref(false)
const showDiscardSelector = ref(false)

// Props
const roomId = route.params.id as string

// Computed
const user = computed(() => authStore.user)
const isDev = computed(() => import.meta.env.DEV)

const deckRemaining = computed(() => gameStore.deckCount)

const otherPlayers = computed(() => 
  roomsStore.roomPlayers.filter(p => p.player_id !== user.value?.id)
)

const canDiscardAll = computed(() => gameStore.myHand.some(card => card.card_count > 0))

const hasAnyPlayableCard = computed(() => 
  gameStore.myHand.some(card => card.card_count > 0 && gameStore.canPlayCard(card.card_type))
)

const myPlayerOrder = computed(() => {
  const myPlayer = roomsStore.roomPlayers.find(p => p.player_id === user.value?.id)
  return myPlayer?.player_order || 1
})

// Methods
const getPlayerEmoji = (order: number) => {
  const emojis = ['🐷', '🐸', '🐵', '🐻']
  return emojis[order - 1] || '👤'
}

const getPlayerNameFromPlayer = (player: any) => {
  return player.profile?.email?.split('@')[0] || `플레이어 ${player.player_order}`
}

const isCurrentPlayer = (order: number) => {
  return gameStore.gameState?.current_player_order === order
}

const getPlayerHandCount = () => {
  // For other players, we don't know their exact hand count for security
  // This would come from game state or be estimated
  return 3
}

const getPlayerPigs = (playerId: string) => {
  return gameStore.otherPlayersPigs.filter(pig => pig.player_id === playerId)
}

const handleCardPlay = async (cardType: string) => {
  await initiateCardPlay(cardType as any)
}

const handleDiscardAllCards = async () => {
  if (!gameStore.canDiscardAllCards || gameStore.turnInProgress) return
  
  try {
    console.log('🗑️ Attempting to discard all cards')
    const result = await gameStore.discardAllCards()
    
    if (result.error) {
      console.error('Failed to discard all cards:', result.error)
    } else {
      console.log('✅ Successfully discarded all cards')
    }
  } catch (error) {
    console.error('Error discarding all cards:', error)
  }
}

const handleEndTurn = async () => {
  if (!gameStore.isMyTurn || gameStore.turnInProgress) return
  await gameStore.endTurn()
}

const handleDiscardCard = async (cardType: string) => {
  if (!gameStore.isMyTurn || gameStore.turnInProgress) return
  
  try {
    const result = await gameStore.discardCard(cardType as any)
    if (result.error) {
      console.error('Failed to discard card:', result.error)
    }
  } catch (error) {
    console.error('Error discarding card:', error)
  } finally {
    showDiscardSelector.value = false
  }
}

const closeDiscardSelector = () => {
  showDiscardSelector.value = false
}


const retryConnection = async () => {
  if (roomId) {
    await gameStore.loadGame(roomId)
  }
}

const confirmLeaveGame = () => {
  if (confirm('정말로 게임에서 나가시겠습니까?')) {
    router.push('/lobby')
  }
}

// Handle page unload events
const handleBeforeUnload = (event: BeforeUnloadEvent): string | undefined => {
  // For critical game states, show confirmation dialog
  if (gameStore.isMyTurn && !gameStore.isGameFinished && gameStore.turnInProgress) {
    event.preventDefault()
    const message = '게임이 진행 중입니다. 정말로 나가시겠습니까?'
    event.returnValue = message
    return message
  }
  return undefined
}

const handleUnload = () => {
  // Perform cleanup when page is actually unloading
  try {
    gameStore.safeCleanupOnLeave()
  } catch (err) {
    console.error('Error during page unload cleanup:', err)
  }
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    console.log('🙈 Page hidden, user might be switching tabs')
  } else {
    console.log('👁️ Page visible again, reconnecting if needed')
    // Optionally refresh connection when user returns
    if (gameStore.gameState && !gameStore.isConnected) {
      gameStore.subscribeToGame(roomId)
    }
  }
}

// Lifecycle
onMounted(async () => {
  if (roomId) {
    await roomsStore.loadRoom(roomId)
    await gameStore.loadGame(roomId)
  } else {
    router.push('/lobby')
  }
  
  // Add page unload event listeners
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('unload', handleUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(async () => {
  // Remove event listeners
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('unload', handleUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  // Perform safe cleanup
  await gameStore.safeCleanupOnLeave()
  roomsStore.stopRoomSubscription()
})
</script>