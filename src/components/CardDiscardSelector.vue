<template>
  <div v-if="show" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-display text-2xl font-bold">카드 1장 버리기</h2>
          <button @click="$emit('cancel')" class="text-gray-400 hover:text-gray-600">
            <span class="text-2xl">×</span>
          </button>
        </div>
        
        <p class="text-gray-600 mb-4">버릴 카드를 선택하세요:</p>
        
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div
            v-for="card in availableCards"
            :key="card.card_type"
            @click="selectCard(card.card_type)"
            class="cursor-pointer transition-all duration-200 transform hover:scale-105"
            :class="{
              'ring-2 ring-primary-500 scale-105': selectedCard === card.card_type
            }"
          >
            <GameCard
              :card-type="card.card_type"
              :count="card.card_count"
              :playable="false"
              :disabled="false"
              size="small"
            />
          </div>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="confirmDiscard"
            :disabled="!selectedCard"
            class="flex-1 btn-primary"
            :class="{ 'opacity-50 cursor-not-allowed': !selectedCard }"
          >
            🗑️ 선택한 카드 버리기
          </button>
          <button
            @click="$emit('cancel')"
            class="flex-1 btn-secondary"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GameCard from './GameCard.vue'
import type { PlayerHand } from '@/types/game'

interface Props {
  show: boolean
  availableCards: PlayerHand[]
}

defineProps<Props>()

const emit = defineEmits<{
  select: [cardType: string]
  cancel: []
}>()

const selectedCard = ref<string | null>(null)

const selectCard = (cardType: string) => {
  selectedCard.value = cardType
}

const confirmDiscard = () => {
  if (selectedCard.value) {
    emit('select', selectedCard.value)
    selectedCard.value = null
  }
}
</script>