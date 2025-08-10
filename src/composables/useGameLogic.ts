import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import type { CardType, PlayerPig } from '@/types/game'
import { CARD_CONFIGS } from '@/types/game'

export function useGameLogic() {
  const gameStore = useGameStore()
  
  const showTargetSelector = ref(false)
  const availableTargets = ref<PlayerPig[]>([])
  const pendingCardPlay = ref<CardType | null>(null)

  // Card information helpers
  const getCardInfo = (cardType: CardType) => {
    return CARD_CONFIGS[cardType] || { name: cardType, emoji: '🃏', count: 0 }
  }

  const getCardEmoji = (cardType: CardType) => {
    return getCardInfo(cardType).emoji
  }

  const getCardName = (cardType: CardType) => {
    return getCardInfo(cardType).name
  }

  // Pig state helpers
  const getPigEmoji = (pig: PlayerPig) => {
    switch (pig.pig_state) {
      case 'dirty':
        return '🐷'
      case 'beautiful':
        return '💄'
      case 'clean':
      default:
        return '🐽'
    }
  }

  const getPigStateClass = (pig: PlayerPig) => {
    switch (pig.pig_state) {
      case 'dirty':
        return 'pig-dirty'
      case 'beautiful':
        return 'pig-beautiful'
      case 'clean':
      default:
        return 'pig-clean'
    }
  }

  // Card targeting logic
  const getValidTargets = (cardType: CardType): PlayerPig[] => {
    const allPigs = gameStore.playerPigs
    const myPigs = gameStore.myPigs
    const otherPigs = gameStore.otherPlayersPigs
    
    switch (cardType) {
      case 'mud':
        return myPigs.filter(pig => pig.pig_state === 'clean' && !pig.has_barn)
      
      case 'barn':
        return myPigs.filter(pig => !pig.has_barn)
      
      case 'bath':
        return otherPigs.filter(pig => 
          pig.pig_state === 'dirty' && (!pig.has_barn || !pig.barn_locked)
        )
      
      case 'lightning':
        return otherPigs.filter(pig => 
          pig.has_barn && !pig.has_lightning_rod
        )
      
      case 'lightning_rod':
        return myPigs.filter(pig => pig.has_barn && !pig.has_lightning_rod)
      
      case 'barn_lock':
        return myPigs.filter(pig => 
          pig.has_barn && pig.pig_state === 'dirty' && !pig.barn_locked
        )
      
      case 'beautiful_pig':
        return allPigs // Can be applied to any pig
      
      case 'escape':
        return allPigs.filter(pig => pig.pig_state === 'beautiful')
      
      // Cards that don't need targets
      case 'rain':
      case 'lucky_bird':
      default:
        return []
    }
  }

  const needsTarget = (cardType: CardType): boolean => {
    const targets = getValidTargets(cardType)
    return targets.length > 1 // If multiple targets available, show selector
  }

  const canAutoTarget = (cardType: CardType): boolean => {
    const targets = getValidTargets(cardType)
    return targets.length === 1 // If only one target, auto-select it
  }

  const hasValidTarget = (cardType: CardType): boolean => {
    return getValidTargets(cardType).length > 0
  }

  // Card play flow
  const initiateCardPlay = async (cardType: CardType) => {
    console.log('🎮 initiateCardPlay called:', cardType)
    console.log('🎮 Game state check:', {
      canPlayCard: gameStore.canPlayCard(cardType),
      isMyTurn: gameStore.isMyTurn,
      turnInProgress: gameStore.turnInProgress,
      cardExecutionInProgress: gameStore.cardExecutionInProgress,
      myPigs: gameStore.myPigs.length,
      otherPigs: gameStore.otherPlayersPigs.length
    })
    
    if (!gameStore.canPlayCard(cardType) || !gameStore.isMyTurn || gameStore.turnInProgress) {
      console.log('🚫 initiateCardPlay blocked:', { 
        canPlayCard: gameStore.canPlayCard(cardType), 
        isMyTurn: gameStore.isMyTurn, 
        turnInProgress: gameStore.turnInProgress,
        cardType 
      })
      return
    }
    
    console.log('✅ initiateCardPlay allowed:', cardType)

    // Check if card needs a target
    if (needsTarget(cardType)) {
      // Set turn in progress to prevent other actions
      gameStore.turnInProgress = true
      
      // Show target selector
      pendingCardPlay.value = cardType
      availableTargets.value = getValidTargets(cardType)
      showTargetSelector.value = true
    } else if (canAutoTarget(cardType)) {
      // Auto-target and play
      const target = getValidTargets(cardType)[0]
      await executeCardPlay(cardType, target)
    } else {
      // No target needed
      await executeCardPlay(cardType)
    }
  }

  // Add selection guard
  const isTargetSelectionInProgress = ref(false)
  
  const selectTarget = async (target: PlayerPig) => {
    if (!pendingCardPlay.value || isTargetSelectionInProgress.value) {
      console.log('🚫 Target selection blocked:', { 
        hasPendingCard: !!pendingCardPlay.value, 
        selectionInProgress: isTargetSelectionInProgress.value 
      })
      return
    }
    
    // Set selection in progress immediately
    isTargetSelectionInProgress.value = true
    
    console.log('🎯 Target selected:', target.id)
    
    // Store the card to play and close selector immediately
    const cardToPlay = pendingCardPlay.value
    
    // Force close target selector immediately - clear all states
    showTargetSelector.value = false
    availableTargets.value = []
    pendingCardPlay.value = null
    
    console.log('🔒 Force closing target selector for target:', target.id)
    
    try {
      // Execute the card play
      await executeCardPlay(cardToPlay, target)
    } finally {
      // Always reset selection guard
      isTargetSelectionInProgress.value = false
    }
  }

  const executeCardPlay = async (cardType: CardType, target?: PlayerPig) => {
    const result = await gameStore.playCard(cardType, target)
    
    if (result.error) {
      console.error('Card play error:', result.error)
      // TODO: Show error message to user
    }
  }

  const closeTargetSelector = (resetTurnInProgress = true) => {
    console.log('🔒 Closing target selector, resetTurn:', resetTurnInProgress)
    
    showTargetSelector.value = false
    availableTargets.value = []
    pendingCardPlay.value = null
    isTargetSelectionInProgress.value = false // Always reset selection guard
    
    // Reset turn in progress only if we're canceling (not completing) target selection
    if (resetTurnInProgress && gameStore.turnInProgress) {
      gameStore.turnInProgress = false
    }
  }

  // Game state helpers
  const getPlayerName = (playerId: string) => {
    const player = gameStore.roomPlayers.find(p => p.player_id === playerId)
    if (player?.profile?.email) {
      return player.profile.email.split('@')[0]
    }
    return `플레이어 ${playerId.slice(-4)}`
  }

  const getPlayerOrder = (playerId: string): number => {
    const player = gameStore.roomPlayers.find(p => p.player_id === playerId)
    return player?.player_order || 1
  }

  const getCurrentPlayerName = () => {
    const currentPlayer = gameStore.currentPlayer
    if (currentPlayer?.profile?.email) {
      return currentPlayer.profile.email.split('@')[0]
    }
    return gameStore.gameState ? `플레이어 ${gameStore.gameState.current_player_order}` : ''
  }

  // Card effect descriptions
  const getCardDescription = (cardType: CardType): string => {
    switch (cardType) {
      case 'mud':
        return '자신의 깨끗한 돼지를 더럽게 만듭니다. "드렉사우!"라고 외치세요!'
      case 'barn':
        return '돼지를 헛간에 넣어 비로부터 보호합니다.'
      case 'bath':
        return '상대방의 더러운 돼지를 깨끗하게 씻깁니다.'
      case 'rain':
        return '헛간 밖의 모든 더러운 돼지를 깨끗하게 만듭니다.'
      case 'lightning':
        return '상대방의 헛간을 태워버립니다. (피뢰침이 없는 경우)'
      case 'lightning_rod':
        return '자신의 헛간에 피뢰침을 설치해 벼락을 방어합니다.'
      case 'barn_lock':
        return '헛간 문을 잠가 더러운 돼지가 목욕당하지 않도록 보호합니다.'
      case 'beautiful_pig':
        return '돼지를 아름답게 만듭니다. 우산이 있어 비에 젖지 않습니다.'
      case 'escape':
        return '아름다운 돼지가 도망가서 아름다운 돼지 카드를 제거합니다.'
      case 'lucky_bird':
        return '손에 있는 모든 카드를 즉시 사용해야 합니다.'
      default:
        return '카드 효과를 알 수 없습니다.'
    }
  }

  // Game status helpers
  const getGamePhaseText = (phase: string): string => {
    switch (phase) {
      case 'setup': return '게임 준비 중'
      case 'playing': return '게임 진행 중'
      case 'finished': return '게임 종료'
      default: return '알 수 없음'
    }
  }

  const getWinConditionText = (): string => {
    const myPigs = gameStore.myPigs
    const dirtyCount = myPigs.filter(p => p.pig_state === 'dirty').length
    const beautifulCount = myPigs.filter(p => p.pig_state === 'beautiful').length
    const totalCount = myPigs.length
    
    if (dirtyCount === totalCount) {
      return '🏆 모든 돼지가 더러워졌습니다! 승리!'
    } else if (beautifulCount === totalCount) {
      return '🏆 모든 돼지가 아름다워졌습니다! 승리!'
    } else {
      const remainingDirty = totalCount - dirtyCount
      const remainingBeautiful = totalCount - beautifulCount
      return `승리까지 - 더러운 돼지: ${remainingDirty}마리 또는 아름다운 돼지: ${remainingBeautiful}마리`
    }
  }

  // Animation helpers
  const playCardAnimation = (cardType: CardType) => {
    // TODO: Implement card play animations
    console.log(`Playing ${cardType} animation`)
  }

  const playPigAnimation = (pig: PlayerPig, effect: string) => {
    // TODO: Implement pig state change animations
    console.log(`Playing ${effect} animation on pig ${pig.id}`)
  }

  return {
    // State
    showTargetSelector,
    availableTargets,
    pendingCardPlay,
    isTargetSelectionInProgress,
    
    // Card helpers
    getCardInfo,
    getCardEmoji,
    getCardName,
    getCardDescription,
    
    // Pig helpers
    getPigEmoji,
    getPigStateClass,
    
    // Targeting
    getValidTargets,
    needsTarget,
    canAutoTarget,
    hasValidTarget,
    
    // Card play flow
    initiateCardPlay,
    selectTarget,
    executeCardPlay,
    closeTargetSelector,
    
    // Game state helpers
    getPlayerName,
    getPlayerOrder,
    getCurrentPlayerName,
    getGamePhaseText,
    getWinConditionText,
    
    // Animations
    playCardAnimation,
    playPigAnimation
  }
}