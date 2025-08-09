<template>
  <div 
    v-if="show" 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click="handleBackdropClick"
  >
    <div 
      class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      @click.stop
    >
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="text-3xl">{{ cardEmoji }}</div>
            <div>
              <h2 class="text-xl font-bold text-gray-800">{{ cardName }} 카드 대상 선택</h2>
              <p class="text-sm text-gray-600 mt-1">{{ cardDescription }}</p>
            </div>
          </div>
          
          <button 
            @click="$emit('cancel')"
            class="text-gray-400 hover:text-gray-600 text-2xl p-1"
          >
            ×
          </button>
        </div>
      </div>
      
      <!-- Target Grid -->
      <div class="p-6">
        <div v-if="targets.length === 0" class="text-center py-8">
          <div class="text-6xl mb-4">🚫</div>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">사용 가능한 대상이 없습니다</h3>
          <p class="text-gray-600 mb-4">이 카드를 현재 상황에서 사용할 수 없습니다.</p>
          <button @click="$emit('cancel')" class="btn-secondary">
            돌아가기
          </button>
        </div>
        
        <div v-else>
          <h3 class="text-lg font-semibold mb-4 text-center">
            대상을 선택하세요 ({{ targets.length }}개 선택 가능)
          </h3>
          
          <!-- Targets by Player -->
          <div class="space-y-6">
            <div 
              v-for="playerGroup in groupedTargets" 
              :key="playerGroup.playerId"
              class="border rounded-lg p-4"
              :class="{
                'border-primary-200 bg-primary-50': playerGroup.isCurrentUser,
                'border-gray-200': !playerGroup.isCurrentUser
              }"
            >
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl">{{ getPlayerEmoji(playerGroup.playerOrder) }}</span>
                <span class="font-medium">{{ playerGroup.playerName }}</span>
                <span v-if="playerGroup.isCurrentUser" class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  내 돼지
                </span>
              </div>
              
              <div class="grid grid-cols-3 md:grid-cols-4 gap-4">
                <div 
                  v-for="pig in playerGroup.pigs" 
                  :key="pig.id"
                  class="relative"
                >
                  <PigCard
                    :pig="pig"
                    :targetable="true"
                    :show-info="true"
                    @click="selectTarget(pig)"
                  />
                  
                  <!-- Selection Button -->
                  <button 
                    @click="selectTarget(pig)"
                    class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary-500 hover:bg-primary-600 text-white text-xs px-3 py-1 rounded-full transition-colors shadow-md"
                  >
                    선택
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
        <button 
          @click="$emit('cancel')"
          class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameLogic } from '@/composables/useGameLogic'
import { useAuthStore } from '@/stores/auth'
import PigCard from './PigCard.vue'
import type { PlayerPig, CardType } from '@/types/game'

interface Props {
  show: boolean
  cardType?: CardType
  targets: PlayerPig[]
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  targets: () => []
})

const emit = defineEmits<{
  select: [pig: PlayerPig]
  cancel: []
}>()

const { 
  getCardEmoji, 
  getCardName, 
  getCardDescription,
  getPlayerName 
} = useGameLogic()

const authStore = useAuthStore()

// Computed
const cardEmoji = computed(() => 
  props.cardType ? getCardEmoji(props.cardType) : '🃏'
)

const cardName = computed(() => 
  props.cardType ? getCardName(props.cardType) : '카드'
)

const cardDescription = computed(() => 
  props.cardType ? getCardDescription(props.cardType) : ''
)

const groupedTargets = computed(() => {
  const groups = new Map<string, {
    playerId: string
    playerName: string
    playerOrder: number
    isCurrentUser: boolean
    pigs: PlayerPig[]
  }>()
  
  props.targets.forEach(pig => {
    if (!groups.has(pig.player_id)) {
      groups.set(pig.player_id, {
        playerId: pig.player_id,
        playerName: getPlayerName(pig.player_id),
        playerOrder: getPlayerOrder(pig.player_id),
        isCurrentUser: pig.player_id === authStore.user?.id,
        pigs: []
      })
    }
    
    groups.get(pig.player_id)!.pigs.push(pig)
  })
  
  return Array.from(groups.values()).sort((a, b) => {
    // Current user first, then by player order
    if (a.isCurrentUser && !b.isCurrentUser) return -1
    if (!a.isCurrentUser && b.isCurrentUser) return 1
    return a.playerOrder - b.playerOrder
  })
})

// Methods
const getPlayerEmoji = (order: number) => {
  const emojis = ['🐷', '🐸', '🐵', '🐻']
  return emojis[order - 1] || '👤'
}

const getPlayerOrder = (playerId: string): number => {
  // TODO: Get from actual player data - for now return 1 as default
  return 1
}

const selectTarget = (pig: PlayerPig) => {
  emit('select', pig)
}

const handleBackdropClick = () => {
  emit('cancel')
}
</script>