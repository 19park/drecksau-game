<template>
  <div 
    class="relative group cursor-pointer select-none"
    :class="{ 'animate-bounce': selected }"
    @click="handleClick"
  >
    <!-- Pig Base -->
    <div 
      class="transition-all duration-300 transform"
      :class="[
        pigClasses,
        sizeClasses,
        {
          'hover:scale-110': !disabled,
          'scale-90 opacity-50': disabled,
          'animate-pig-shake': shaking,
          'filter drop-shadow-lg': selected
        }
      ]"
    >
      {{ pigEmoji }}
    </div>
    
    <!-- Barn -->
    <div 
      v-if="pig.has_barn"
      class="absolute -top-3 -right-3 text-2xl transition-all duration-300"
      :class="{ 'animate-bounce': barnEffect }"
      title="헛간"
    >
      🏠
    </div>
    
    <!-- Lightning Rod -->
    <div 
      v-if="pig.has_lightning_rod"
      class="absolute -top-3 -left-3 text-xl transition-all duration-300"
      :class="{ 'animate-pulse': lightningEffect }"
      title="피뢰침"
    >
      🔌
    </div>
    
    <!-- Barn Lock -->
    <div 
      v-if="pig.barn_locked"
      class="absolute -bottom-2 -right-2 text-lg"
      title="헛간 잠금"
    >
      🔒
    </div>
    
    <!-- Selection Ring -->
    <div 
      v-if="selected"
      class="absolute inset-0 rounded-full border-4 border-primary-400 animate-pulse pointer-events-none"
      style="transform: scale(1.2);"
    ></div>
    
    <!-- Pig State Indicator -->
    <div class="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
      <div 
        class="w-3 h-3 rounded-full border-2 border-white shadow-md"
        :class="stateIndicatorClass"
        :title="stateText"
      ></div>
    </div>
    
    <!-- Hover Info -->
    <div 
      v-if="showInfo && !disabled"
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    >
      <div class="font-semibold">{{ pigStateText }}</div>
      <div v-if="pig.has_barn" class="text-gray-300">🏠 헛간 보호</div>
      <div v-if="pig.barn_locked" class="text-gray-300">🔒 잠금</div>
      <div v-if="pig.has_lightning_rod" class="text-gray-300">🔌 피뢰침</div>
      
      <!-- Tooltip Arrow -->
      <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
    
    <!-- Special Effects -->
    <div v-if="mudSplash" class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0 bg-mud-400 rounded-full animate-splash opacity-70"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl animate-bounce">
        💩
      </div>
    </div>
    
    <div v-if="sparkles" class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 right-0 text-lg animate-ping">✨</div>
      <div class="absolute bottom-0 left-0 text-lg animate-ping delay-100">✨</div>
      <div class="absolute top-0 left-0 text-lg animate-ping delay-200">💫</div>
    </div>
    
    <div v-if="washEffect" class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0 bg-blue-200 rounded-full animate-splash opacity-50"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl animate-bounce">
        🛁
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameLogic } from '@/composables/useGameLogic'
import type { PlayerPig } from '@/types/game'

interface Props {
  pig: PlayerPig
  selected?: boolean
  disabled?: boolean
  showInfo?: boolean
  targetable?: boolean
  playerOrder?: number
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  disabled: false,
  showInfo: true,
  targetable: false,
  size: 'medium'
})

const emit = defineEmits<{
  click: [pig: PlayerPig]
  select: [pig: PlayerPig]
}>()

const { getPigEmoji, getPigStateClass } = useGameLogic()

// State for effects
const shaking = ref(false)
const barnEffect = ref(false)
const lightningEffect = ref(false)
const mudSplash = ref(false)
const sparkles = ref(false)
const washEffect = ref(false)

// Computed
const pigEmoji = computed(() => getPigEmoji(props.pig))
const pigClasses = computed(() => getPigStateClass(props.pig))
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small': return 'text-3xl'
    case 'large': return 'text-6xl'
    case 'medium':
    default: return 'text-4xl'
  }
})

const stateIndicatorClass = computed(() => {
  switch (props.pig.pig_state) {
    case 'dirty':
      return 'bg-mud-500'
    case 'beautiful':
      return 'bg-purple-500'
    case 'clean':
    default:
      return 'bg-pink-400'
  }
})

const stateText = computed(() => {
  switch (props.pig.pig_state) {
    case 'dirty': return '더러운 돼지'
    case 'beautiful': return '아름다운 돼지'
    case 'clean': return '깨끗한 돼지'
    default: return '알 수 없음'
  }
})

const pigStateText = computed(() => {
  let text = stateText.value
  if (props.pig.has_barn) text += ' (헛간)'
  if (props.pig.barn_locked) text += ' (잠금)'
  return text
})

// Watch for state changes to trigger effects
watch(() => props.pig.pig_state, (newState, oldState) => {
  if (oldState && newState !== oldState) {
    triggerStateChangeEffect(newState, oldState)
  }
})

watch(() => props.pig.has_barn, (newValue, oldValue) => {
  if (!oldValue && newValue) {
    triggerBarnEffect()
  }
})

// Methods
const handleClick = () => {
  if (props.disabled) return
  
  emit('click', props.pig)
  
  if (props.targetable) {
    emit('select', props.pig)
  }
}

const triggerStateChangeEffect = (newState: string, oldState: string) => {
  if (newState === 'dirty' && oldState !== 'dirty') {
    triggerMudSplash()
    triggerShake()
  } else if (newState === 'beautiful' && oldState !== 'beautiful') {
    triggerSparkles()
  } else if (newState === 'clean' && oldState === 'dirty') {
    triggerWashEffect()
  }
}

const triggerShake = () => {
  shaking.value = true
  setTimeout(() => {
    shaking.value = false
  }, 1000)
}

const triggerBarnEffect = () => {
  barnEffect.value = true
  setTimeout(() => {
    barnEffect.value = false
  }, 1500)
}

const triggerLightningEffect = () => {
  lightningEffect.value = true
  setTimeout(() => {
    lightningEffect.value = false
  }, 2000)
}

const triggerMudSplash = () => {
  mudSplash.value = true
  setTimeout(() => {
    mudSplash.value = false
  }, 1500)
}

const triggerSparkles = () => {
  sparkles.value = true
  setTimeout(() => {
    sparkles.value = false
  }, 2000)
}

const triggerWashEffect = () => {
  washEffect.value = true
  setTimeout(() => {
    washEffect.value = false
  }, 1500)
}

// Expose methods for external triggering
defineExpose({
  triggerShake,
  triggerBarnEffect,
  triggerLightningEffect,
  triggerMudSplash,
  triggerSparkles,
  triggerWashEffect
})
</script>

<style scoped>
@keyframes pig-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px) rotate(-2deg); }
  75% { transform: translateX(5px) rotate(2deg); }
}

@keyframes splash {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.animate-pig-shake {
  animation: pig-shake 0.5s ease-in-out;
}

.animate-splash {
  animation: splash 0.8s ease-out;
}

.pig-clean {
  filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.3));
}

.pig-dirty {
  filter: drop-shadow(0 0 8px rgba(133, 77, 14, 0.5));
}

.pig-beautiful {
  filter: drop-shadow(0 0 8px rgba(147, 51, 234, 0.5));
}
</style>