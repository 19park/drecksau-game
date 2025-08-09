import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import type { 
  GameState, 
  PlayerPig, 
  PlayerHand, 
  GameDeck, 
  CardType, 
  GameMessage,
  GameAction
} from '@/types/game'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  
  // Game state
  const gameState = ref<GameState | null>(null)
  const playerPigs = ref<PlayerPig[]>([])
  const playerHands = ref<PlayerHand[]>([])
  const gameDeck = ref<GameDeck[]>([])
  const roomPlayers = ref<any[]>([]) // Store room players for turn management
  const loading = ref(false)
  const error = ref('')
  
  // UI state
  const selectedCard = ref<CardType | null>(null)
  const selectedPig = ref<PlayerPig | null>(null)
  const showCardEffect = ref(false)
  const lastAction = ref<string>('')
  
  // Realtime connection state
  const isConnected = ref(false)
  const connectionError = ref('')
  
  let gameChannel: RealtimeChannel | null = null

  // Computed
  const myPlayerOrder = computed(() => {
    if (!authStore.user) return null
    const myPlayer = roomPlayers.value.find(p => p.player_id === authStore.user?.id)
    return myPlayer?.player_order || null
  })

  const isMyTurn = computed(() => {
    if (!gameState.value || !myPlayerOrder.value) return false
    return gameState.value.current_player_order === myPlayerOrder.value
  })

  const currentPlayer = computed(() => {
    if (!gameState.value) return null
    return roomPlayers.value.find(p => p.player_order === gameState.value?.current_player_order)
  })

  const myPigs = computed(() => 
    playerPigs.value.filter(pig => pig.player_id === authStore.user?.id)
  )

  const myHand = computed(() => 
    playerHands.value.filter(hand => hand.player_id === authStore.user?.id)
  )

  const otherPlayersPigs = computed(() => 
    playerPigs.value.filter(pig => pig.player_id !== authStore.user?.id)
  )

  const deckCount = computed(() => 
    gameDeck.value.reduce((total, deck) => total + deck.remaining_count, 0)
  )

  const canPlayCard = computed(() => (cardType: CardType) => {
    if (!isMyTurn.value) return false
    
    const handCard = myHand.value.find(h => h.card_type === cardType)
    if (!handCard || handCard.card_count <= 0) return false
    
    // Card-specific logic
    switch (cardType) {
      case 'mud':
        return myPigs.value.some(pig => pig.pig_state === 'clean' && !pig.has_barn)
      case 'barn':
        return myPigs.value.some(pig => !pig.has_barn)
      case 'bath':
        return otherPlayersPigs.value.some(pig => pig.pig_state === 'dirty')
      case 'rain':
        return playerPigs.value.some(pig => pig.pig_state === 'dirty' && !pig.has_barn)
      case 'lightning':
        return otherPlayersPigs.value.some(pig => pig.has_barn && !pig.has_lightning_rod)
      case 'lightning_rod':
        return myPigs.value.some(pig => pig.has_barn && !pig.has_lightning_rod)
      case 'barn_lock':
        return myPigs.value.some(pig => pig.has_barn && pig.pig_state === 'dirty' && !pig.barn_locked)
      default:
        return true
    }
  })

  const hasWon = computed(() => {
    const myPigsData = myPigs.value
    if (myPigsData.length === 0) return false
    
    // Check if all pigs are dirty (basic win condition)
    const allDirty = myPigsData.every(pig => pig.pig_state === 'dirty')
    
    // Check if all pigs are beautiful (expansion win condition)
    const allBeautiful = myPigsData.every(pig => pig.pig_state === 'beautiful')
    
    return allDirty || allBeautiful
  })

  const winConditionType = computed(() => {
    if (!hasWon.value) return null
    
    const myPigsData = myPigs.value
    const allDirty = myPigsData.every(pig => pig.pig_state === 'dirty')
    const allBeautiful = myPigsData.every(pig => pig.pig_state === 'beautiful')
    
    if (allDirty) return 'dirty'
    if (allBeautiful) return 'beautiful'
    return null
  })

  // Game initialization
  const initializeGame = async (roomId: string) => {
    loading.value = true
    error.value = ''
    
    try {
      console.log('🎮 Initializing game for room:', roomId)
      
      // Call the database function to initialize the game
      const { data, error: initError } = await supabase.rpc('initialize_game', {
        room_id_param: roomId
      })
      
      if (initError) throw initError
      
      console.log('✅ Game initialized successfully:', data)
      
      // Load the initialized game
      await loadGame(roomId)
      
      return { error: null }
      
    } catch (err: any) {
      error.value = err.message
      console.error('❌ Error initializing game:', err)
      return { error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Actions
  const loadGame = async (roomId: string) => {
    loading.value = true
    error.value = ''
    
    try {
      // Load game state
      const { data: gameData, error: gameError } = await supabase
        .from('game_states')
        .select('*')
        .eq('room_id', roomId)
        .single()
      
      if (gameError) throw gameError
      gameState.value = gameData
      
      // Load all player pigs
      const { data: pigsData, error: pigsError } = await supabase
        .from('player_pigs')
        .select('*')
        .eq('room_id', roomId)
      
      if (pigsError) throw pigsError
      playerPigs.value = pigsData || []
      
      // Load player hands (only mine for security)
      const { data: handsData, error: handsError } = await supabase
        .from('player_hands')
        .select('*')
        .eq('room_id', roomId)
        .eq('player_id', authStore.user?.id)
      
      if (handsError) throw handsError
      playerHands.value = handsData || []
      
      // Load deck state
      const { data: deckData, error: deckError } = await supabase
        .from('game_deck')
        .select('*')
        .eq('room_id', roomId)
      
      if (deckError) throw deckError
      gameDeck.value = deckData || []
      
      // Load room players for turn management
      const { data: playersData, error: playersError } = await supabase
        .from('room_players')
        .select(`
          *,
          user:users(email)
        `)
        .eq('room_id', roomId)
        .order('player_order')
      
      if (playersError) throw playersError
      roomPlayers.value = playersData || []
      
      // Subscribe to real-time game updates
      await subscribeToGame(roomId)
      
    } catch (err: any) {
      error.value = err.message
      console.error('Error loading game:', err)
    } finally {
      loading.value = false
    }
  }

  const playCard = async (cardType: CardType, targetPig?: PlayerPig) => {
    if (!gameState.value || !authStore.user || !isMyTurn.value) {
      return { error: 'Cannot play card' }
    }
    
    if (!canPlayCard.value(cardType)) {
      return { error: 'Cannot play this card' }
    }
    
    try {
      // Execute card effect based on type
      await executeCardEffect(cardType, targetPig)
      
      // Remove card from hand
      await removeCardFromHand(cardType)
      
      // Draw new card
      await drawCard()
      
      // Check for win condition
      if (hasWon.value) {
        await endGame()
      } else {
        // End turn
        await endTurn()
      }
      
      return { error: null }
      
    } catch (err: any) {
      error.value = err.message
      return { error: err.message }
    }
  }

  const executeCardEffect = async (cardType: CardType, targetPig?: PlayerPig) => {
    switch (cardType) {
      case 'mud':
        await applyMudCard(targetPig)
        break
      case 'barn':
        await applyBarnCard(targetPig)
        break
      case 'bath':
        await applyBathCard(targetPig)
        break
      case 'rain':
        await applyRainCard()
        break
      case 'lightning':
        await applyLightningCard(targetPig)
        break
      case 'lightning_rod':
        await applyLightningRodCard(targetPig)
        break
      case 'barn_lock':
        await applyBarnLockCard(targetPig)
        break
      default:
        throw new Error(`Unknown card type: ${cardType}`)
    }
    
    // Broadcast action to other players
    await broadcastGameAction(cardType, targetPig)
    
    // Show card effect animation
    showCardEffect.value = true
    lastAction.value = `${cardType} 카드를 사용했습니다!`
    setTimeout(() => {
      showCardEffect.value = false
    }, 2000)
  }

  const applyMudCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      // Find first clean pig without barn
      targetPig = myPigs.value.find(pig => pig.pig_state === 'clean' && !pig.has_barn)
    }
    
    if (!targetPig) throw new Error('No valid pig to make dirty')
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ pig_state: 'dirty' })
      .eq('id', targetPig.id)
    
    if (error) throw error
    
    // Play "Drecksau!" sound effect (mock)
    console.log('🐷 Drecksau!')
  }

  const applyBarnCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = myPigs.value.find(pig => !pig.has_barn)
    }
    
    if (!targetPig) throw new Error('No valid pig for barn')
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ has_barn: true })
      .eq('id', targetPig.id)
    
    if (error) throw error
  }

  const applyBathCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      // Find first dirty pig from other players
      targetPig = otherPlayersPigs.value.find(pig => 
        pig.pig_state === 'dirty' && (!pig.has_barn || !pig.barn_locked)
      )
    }
    
    if (!targetPig) throw new Error('No valid pig to wash')
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ pig_state: 'clean' })
      .eq('id', targetPig.id)
    
    if (error) throw error
  }

  const applyRainCard = async () => {
    // Clean all dirty pigs not in barns
    const { error } = await supabase
      .from('player_pigs')
      .update({ pig_state: 'clean' })
      .eq('pig_state', 'dirty')
      .eq('has_barn', false)
    
    if (error) throw error
  }

  const applyLightningCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = otherPlayersPigs.value.find(pig => 
        pig.has_barn && !pig.has_lightning_rod
      )
    }
    
    if (!targetPig) throw new Error('No valid barn to strike')
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ 
        has_barn: false,
        barn_locked: false 
      })
      .eq('id', targetPig.id)
    
    if (error) throw error
  }

  const applyLightningRodCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = myPigs.value.find(pig => pig.has_barn && !pig.has_lightning_rod)
    }
    
    if (!targetPig) throw new Error('No valid barn for lightning rod')
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ has_lightning_rod: true })
      .eq('id', targetPig.id)
    
    if (error) throw error
  }

  const applyBarnLockCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = myPigs.value.find(pig => 
        pig.has_barn && pig.pig_state === 'dirty' && !pig.barn_locked
      )
    }
    
    if (!targetPig) throw new Error('No valid barn to lock')
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ barn_locked: true })
      .eq('id', targetPig.id)
    
    if (error) throw error
  }

  const removeCardFromHand = async (cardType: CardType) => {
    const handCard = myHand.value.find(h => h.card_type === cardType)
    if (!handCard) return
    
    if (handCard.card_count > 1) {
      const { error } = await supabase
        .from('player_hands')
        .update({ card_count: handCard.card_count - 1 })
        .eq('id', handCard.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('player_hands')
        .delete()
        .eq('id', handCard.id)
      
      if (error) throw error
    }
  }

  const drawCard = async () => {
    if (!gameState.value || !authStore.user) return
    
    const { data, error } = await supabase.rpc('draw_card', {
      room_id_param: gameState.value.room_id,
      player_id_param: authStore.user.id
    })
    
    if (error) throw error
    return data
  }

  const discardCard = async (cardType: CardType) => {
    if (!isMyTurn.value) return { error: 'Not your turn' }
    
    try {
      // Remove card from hand
      await removeCardFromHand(cardType)
      
      // Add to discard pile
      const { error } = await supabase
        .from('discarded_cards')
        .upsert({
          room_id: gameState.value!.room_id,
          card_type: cardType,
          discarded_count: 1
        }, {
          onConflict: 'room_id,card_type',
          ignoreDuplicates: false
        })
      
      if (error) throw error
      
      // Draw new card
      await drawCard()
      
      // End turn
      await endTurn()
      
      return { error: null }
      
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const discardAllCards = async () => {
    if (!isMyTurn.value || myHand.value.length === 0) {
      return { error: 'Cannot discard all cards' }
    }
    
    try {
      // Remove all cards from hand
      const { error: deleteError } = await supabase
        .from('player_hands')
        .delete()
        .eq('room_id', gameState.value!.room_id)
        .eq('player_id', authStore.user!.id)
      
      if (deleteError) throw deleteError
      
      // Draw 3 new cards
      for (let i = 0; i < 3; i++) {
        await drawCard()
      }
      
      // End turn (this completes the action, no additional card draw)
      await endTurnWithoutDraw()
      
      return { error: null }
      
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const endTurn = async () => {
    if (!gameState.value) return
    
    // Get next player order
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('player_order')
      .eq('room_id', gameState.value.room_id)
      .order('player_order')
    
    if (playersError) throw playersError
    
    const currentOrder = gameState.value.current_player_order
    const playerOrders = players.map(p => p.player_order).sort((a, b) => a - b)
    const currentIndex = playerOrders.indexOf(currentOrder)
    const nextIndex = (currentIndex + 1) % playerOrders.length
    const nextOrder = playerOrders[nextIndex]
    
    // Update game state
    const { error } = await supabase
      .from('game_states')
      .update({ current_player_order: nextOrder })
      .eq('room_id', gameState.value.room_id)
    
    if (error) throw error
  }

  const endTurnWithoutDraw = async () => {
    // Same as endTurn but doesn't trigger card drawing
    await endTurn()
  }

  const endGame = async () => {
    if (!gameState.value || !authStore.user) return
    
    const { data, error } = await supabase.rpc('check_game_winner', {
      room_id_param: gameState.value.room_id,
      player_id_param: authStore.user.id
    })
    
    if (error) throw error
    return data
  }

  // Broadcast game action to other players
  const broadcastGameAction = async (action: CardType, targetPig?: PlayerPig) => {
    if (!gameChannel || !gameState.value) return
    
    console.log('📡 Broadcasting action:', action)
    
    try {
      await gameChannel.send({
        type: 'broadcast',
        event: 'game_action',
        payload: {
          action,
          player_id: authStore.user?.id,
          target_pig_id: targetPig?.id,
          timestamp: new Date().toISOString()
        }
      })
    } catch (err) {
      console.error('Failed to broadcast action:', err)
    }
  }

  // Realtime update handlers
  const handleGameStateUpdate = async (payload: any) => {
    console.log('🎮 Game state update:', payload)
    
    if (payload.eventType === 'UPDATE' && payload.new) {
      gameState.value = payload.new
    } else if (payload.eventType === 'DELETE') {
      gameState.value = null
    }
  }

  const handlePlayerPigsUpdate = async (payload: any) => {
    console.log('🐷 Player pigs update:', payload)
    
    if (payload.eventType === 'INSERT' && payload.new) {
      const existingIndex = playerPigs.value.findIndex(pig => pig.id === payload.new.id)
      if (existingIndex === -1) {
        playerPigs.value.push(payload.new)
      }
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      const index = playerPigs.value.findIndex(pig => pig.id === payload.new.id)
      if (index !== -1) {
        playerPigs.value[index] = payload.new
      }
    } else if (payload.eventType === 'DELETE' && payload.old) {
      const index = playerPigs.value.findIndex(pig => pig.id === payload.old.id)
      if (index !== -1) {
        playerPigs.value.splice(index, 1)
      }
    }
  }

  const handlePlayerHandsUpdate = async (payload: any) => {
    console.log('🃏 Player hands update:', payload)
    
    // Only update our own hand for security
    if (payload.new?.player_id !== authStore.user?.id) return
    
    if (payload.eventType === 'INSERT' && payload.new) {
      const existingIndex = playerHands.value.findIndex(hand => 
        hand.player_id === payload.new.player_id && hand.card_type === payload.new.card_type
      )
      if (existingIndex === -1) {
        playerHands.value.push(payload.new)
      } else {
        playerHands.value[existingIndex] = payload.new
      }
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      const index = playerHands.value.findIndex(hand => 
        hand.id === payload.new.id
      )
      if (index !== -1) {
        playerHands.value[index] = payload.new
      }
    } else if (payload.eventType === 'DELETE' && payload.old) {
      const index = playerHands.value.findIndex(hand => 
        hand.id === payload.old.id
      )
      if (index !== -1) {
        playerHands.value.splice(index, 1)
      }
    }
  }

  const handleGameDeckUpdate = async (payload: any) => {
    console.log('🎴 Game deck update:', payload)
    
    if (payload.eventType === 'UPDATE' && payload.new) {
      const index = gameDeck.value.findIndex(deck => 
        deck.room_id === payload.new.room_id && deck.card_type === payload.new.card_type
      )
      if (index !== -1) {
        gameDeck.value[index] = payload.new
      } else {
        gameDeck.value.push(payload.new)
      }
    }
  }

  const handleGameActionBroadcast = async (payload: any) => {
    console.log('📡 Game action broadcast:', payload)
    
    const { action, player_id } = payload.payload
    
    // Show visual feedback for actions by other players
    if (player_id !== authStore.user?.id) {
      lastAction.value = `다른 플레이어가 ${action}을(를) 사용했습니다!`
      showCardEffect.value = true
      
      setTimeout(() => {
        showCardEffect.value = false
      }, 2000)
    }
  }

  // Realtime subscriptions
  const subscribeToGame = async (roomId: string) => {
    // Unsubscribe from any existing channel
    stopGameSubscription()
    
    console.log('🔌 Subscribing to game updates for room:', roomId)
    
    gameChannel = supabase
      .channel(`game:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_states',
        filter: `room_id=eq.${roomId}`
      }, handleGameStateUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_pigs',
        filter: `room_id=eq.${roomId}`
      }, handlePlayerPigsUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_hands',
        filter: `room_id=eq.${roomId} AND player_id=eq.${authStore.user?.id}`
      }, handlePlayerHandsUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_deck',
        filter: `room_id=eq.${roomId}`
      }, handleGameDeckUpdate)
      .on('broadcast', {
        event: 'game_action'
      }, handleGameActionBroadcast)
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to game updates')
          isConnected.value = true
          connectionError.value = ''
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to game updates')
          isConnected.value = false
          connectionError.value = 'Failed to connect to real-time updates'
          error.value = 'Failed to connect to real-time updates'
        } else if (status === 'CLOSED') {
          console.log('🔌 Connection closed')
          isConnected.value = false
        }
      })
  }

  const stopGameSubscription = () => {
    if (gameChannel) {
      console.log('🔌 Unsubscribing from game updates')
      gameChannel.unsubscribe()
      gameChannel = null
      isConnected.value = false
    }
  }

  // Cleanup
  const cleanup = () => {
    gameState.value = null
    playerPigs.value = []
    playerHands.value = []
    gameDeck.value = []
    roomPlayers.value = []
    selectedCard.value = null
    selectedPig.value = null
    error.value = ''
    stopGameSubscription()
  }

  return {
    // State
    gameState,
    playerPigs,
    playerHands,
    gameDeck,
    roomPlayers,
    loading,
    error,
    selectedCard,
    selectedPig,
    showCardEffect,
    lastAction,
    isConnected,
    connectionError,
    
    // Computed
    myPlayerOrder,
    isMyTurn,
    currentPlayer,
    myPigs,
    myHand,
    otherPlayersPigs,
    deckCount,
    canPlayCard,
    hasWon,
    winConditionType,
    
    // Actions
    initializeGame,
    loadGame,
    playCard,
    discardCard,
    discardAllCards,
    drawCard,
    endTurn,
    subscribeToGame,
    stopGameSubscription,
    cleanup
  }
})