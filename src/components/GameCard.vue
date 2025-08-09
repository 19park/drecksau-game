<template>
  <div 
    class="game-card bg-white relative cursor-pointer select-none"
    :class="[
      cardClasses,
      { 
        'ring-2 ring-primary-400 bg-primary-50': selected,
        'opacity-50 cursor-not-allowed': disabled,
        'hover:scale-105 hover:shadow-lg': !disabled && playable,
        'animate-bounce': playable && highlighted
      }
    ]"
    @click="handleClick"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <!-- Card Content -->
    <div class="flex flex-col items-center justify-center p-3 h-full">
      <!-- Card Emoji -->
      <div class="text-2xl mb-2 transition-transform" :class="{ 'animate-wiggle': playable && highlighted }">
        {{ cardEmoji }}
      </div>
      
      <!-- Card Name -->
      <div class="text-xs font-medium text-center leading-tight">
        {{ cardName }}
      </div>
    </div>
    
    <!-- Card Count Badge -->
    <div 
      v-if="count > 1" 
      class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md"
    >
      {{ count }}
    </div>
    
    <!-- Playable Indicator -->
    <div 
      v-if="playable && !disabled" 
      class="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"
      title="플레이 가능"
    ></div>
    
    <!-- Tooltip -->
    <div 
      v-if="showTooltip && showTooltips"
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap"
      style="max-width: 200px; white-space: normal;"
    >
      <div class="font-semibold mb-1">{{ cardName }}</div>
      <div class="text-gray-300 text-xs">{{ cardDescription }}</div>
      
      <!-- Tooltip Arrow -->
      <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameLogic } from '@/composables/useGameLogic'
import type { CardType } from '@/types/game'

interface Props {
  cardType: CardType
  count?: number
  selected?: boolean
  disabled?: boolean
  playable?: boolean
  highlighted?: boolean
  showTooltips?: boolean
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  count: 1,
  selected: false,
  disabled: false,
  playable: false,
  highlighted: false,
  showTooltips: true,
  size: 'medium'
})

const emit = defineEmits<{
  click: [cardType: CardType]
  select: [cardType: CardType]
  play: [cardType: CardType]
}>()

const { getCardEmoji, getCardName, getCardDescription } = useGameLogic()

// State
const showTooltip = ref(false)

// Computed
const cardEmoji = computed(() => getCardEmoji(props.cardType))
const cardName = computed(() => getCardName(props.cardType))
const cardDescription = computed(() => getCardDescription(props.cardType))

const cardClasses = computed(() => {
  const sizeClasses = {
    small: 'w-16 h-22',
    medium: 'w-20 h-28', 
    large: 'w-24 h-32'
  }
  
  return [
    sizeClasses[props.size],
    'shadow-card',
    'transition-all duration-300',
    'rounded-lg',
    'border border-gray-200'
  ]
})

// Methods
const handleClick = () => {
  if (props.disabled) return
  
  emit('click', props.cardType)
  
  if (props.playable) {
    emit('play', props.cardType)
  } else {
    emit('select', props.cardType)
  }
}
</script>

<style scoped>
.game-card {
  transform-style: preserve-3d;
  perspective: 1000px;
}

.game-card:hover {
  transform: translateY(-2px) rotateX(2deg) rotateY(1deg);
}

@keyframes wiggle {
  0%, 100% { transform: rotate(-3deg) scale(1.05); }
  50% { transform: rotate(3deg) scale(1.1); }
}

.animate-wiggle {
  animation: wiggle 1s ease-in-out infinite;
}
</style>