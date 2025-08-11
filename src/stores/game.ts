import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import type { 
  GameState, 
  PlayerPig, 
  PlayerHand, 
  GameDeck, 
  CardType
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
  const turnInProgress = ref(false) // Track if current turn is being processed
  const cardExecutionInProgress = ref(false) // Track if any card execution is happening
  
  // Realtime connection state
  const isConnected = ref(false)
  const connectionError = ref('')
  
  let gameChannel: RealtimeChannel | null = null
  let gameStatePollingInterval: NodeJS.Timeout | null = null

  // Computed
  const myPlayerOrder = computed(() => {
    if (!authStore.user) return null
    const myPlayer = roomPlayers.value.find(p => p.player_id === authStore.user?.id)
    return myPlayer?.player_order || null
  })

  const isMyTurn = computed(() => {
    if (!gameState.value || !myPlayerOrder.value) return false
    const result = gameState.value.current_player_order === myPlayerOrder.value
    // console.log('🎯 isMyTurn check:', { current: gameState.value.current_player_order, my: myPlayerOrder.value, result })
    return result
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
    if (!isMyTurn.value || turnInProgress.value) {
      return false
    }
    
    const handCard = myHand.value.find(h => h.card_type === cardType)
    if (!handCard || handCard.card_count <= 0) {
      return false
    }
    
    // Card-specific logic
    let canPlay = false
    switch (cardType) {
      case 'mud':
        canPlay = myPigs.value.some(pig => pig.pig_state === 'clean' && !pig.has_barn)
        break
      case 'barn':
        // Barn can be placed on any pig (clean or dirty) that doesn't have a barn
        canPlay = myPigs.value.some(pig => !pig.has_barn)
        break
      case 'bath':
        const validTargets = otherPlayersPigs.value.filter(pig => 
          pig.pig_state === 'dirty' && (!pig.has_barn || !pig.barn_locked)
        )
        canPlay = validTargets.length > 0
        
        console.log('🛁 Bath card check:', {
          isMyTurn: isMyTurn.value,
          turnInProgress: turnInProgress.value,
          otherPlayersPigsCount: otherPlayersPigs.value.length,
          otherPlayersPigs: otherPlayersPigs.value.map(p => ({
            id: p.id.slice(0, 8),
            player_id: p.player_id.slice(0, 8),
            pig_state: p.pig_state,
            has_barn: p.has_barn,
            barn_locked: p.barn_locked,
            canTarget: p.pig_state === 'dirty' && (!p.has_barn || !p.barn_locked)
          })),
          validTargetsCount: validTargets.length,
          canPlay
        })
        break
      case 'rain':
        // Rain card affects ALL players' dirty pigs (not just mine)
        canPlay = playerPigs.value.some(pig => pig.pig_state === 'dirty' && !pig.has_barn)
        break
      case 'lightning':
        canPlay = otherPlayersPigs.value.some(pig => pig.has_barn && !pig.has_lightning_rod)
        break
      case 'lightning_rod':
        canPlay = myPigs.value.some(pig => pig.has_barn && !pig.has_lightning_rod)
        break
      case 'barn_lock':
        canPlay = myPigs.value.some(pig => pig.has_barn && pig.pig_state === 'dirty' && !pig.barn_locked)
        break
      default:
        canPlay = true
    }
    
    return canPlay
  })

  // Check if player cannot play any cards and can discard all 3
  const canDiscardAllCards = computed(() => {
    if (!isMyTurn.value || turnInProgress.value) {
      return false
    }
    
    // Must have exactly 3 cards
    const totalCards = myHand.value.reduce((sum, hand) => sum + hand.card_count, 0)
    if (totalCards !== 3) {
      return false
    }
    
    // None of the cards must be playable
    const playableCards = myHand.value.filter(hand => 
      hand.card_count > 0 && canPlayCard.value(hand.card_type)
    )
    
    return playableCards.length === 0
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

  const isGameFinished = computed(() => {
    return gameState.value?.game_phase === 'finished'
  })

  const isWinner = computed(() => {
    if (!isGameFinished.value) return false
    return gameState.value?.winner_player_id === authStore.user?.id
  })

  const winnerInfo = computed(() => {
    if (!isGameFinished.value) return null
    
    const winnerId = gameState.value?.winner_player_id
    if (!winnerId) return null
    
    const winnerPlayer = roomPlayers.value.find(p => p.player_id === winnerId)
    return {
      id: winnerId,
      name: winnerPlayer?.profile?.email?.split('@')[0] || 'Unknown Player'
    }
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
      
      // Wait a moment for the database to commit the changes
      await new Promise(resolve => setTimeout(resolve, 500))
      
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
    // Prevent concurrent loadGame calls
    if (loading.value) {
      console.log('⚠️ loadGame already in progress, skipping')
      return
    }
    
    loading.value = true
    error.value = ''
    
    console.log('🔄 Loading game for room:', roomId)
    
    try {
      // Load game state
      const { data: gameData, error: gameError } = await supabase
        .from('game_states')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle()  // Use maybeSingle() instead of single() to handle 0 rows
      
      if (gameError) throw gameError
      
      if (!gameData) {
        throw new Error('Game state not found. Game may not have started yet.')
      }
      
      gameState.value = gameData
      
      // Check if game is already finished
      if (gameData.game_phase === 'finished') {
        console.log('🏁 Game is already finished. Winner:', gameData.winner_player_id)
        
        // Set the appropriate win state based on who won
        if (gameData.winner_player_id === authStore.user?.id) {
          // I won the game
          console.log('🏆 I am the winner!')
        } else {
          // Another player won
          console.log('😞 Another player won the game')
          
          // Show finished state notification
          const winnerPlayer = roomPlayers.value.find(p => p.player_id === gameData.winner_player_id)
          const winnerName = winnerPlayer?.profile?.email?.split('@')[0] || 'Unknown Player'
          lastAction.value = `🏆 ${winnerName}님이 이미 게임에서 승리했습니다!`
          showCardEffect.value = true
          
          setTimeout(() => {
            showCardEffect.value = false
          }, 5000)
        }
      }
      
      // Load all player pigs
      const { data: pigsData, error: pigsError } = await supabase
        .from('player_pigs')
        .select('*')
        .eq('room_id', roomId)
      
      if (pigsError) throw pigsError
      playerPigs.value = pigsData || []
      console.log('🐷 Loaded player pigs:', playerPigs.value.length, playerPigs.value)
      
      // Load player hands (only mine for security)
      const { data: handsData, error: handsError } = await supabase
        .from('player_hands')
        .select('*')
        .eq('room_id', roomId)
        .eq('player_id', authStore.user?.id)
      
      if (handsError) throw handsError
      
      // Clear existing hands first to prevent duplicates on refresh
      playerHands.value = []
      playerHands.value = handsData || []
      
      console.log('🃏 Loaded player hands:', playerHands.value.length)
      console.log('📋 Hand details:', playerHands.value.map(h => ({
        id: h.id?.slice(0, 8),
        card_type: h.card_type,
        card_count: h.card_count
      })))
      
      // Check for potential duplicates in database
      const duplicateCheck = handsData?.reduce((acc: any, hand: any) => {
        acc[hand.card_type] = (acc[hand.card_type] || 0) + 1
        return acc
      }, {})
      
      const duplicates = Object.entries(duplicateCheck || {}).filter(([_, count]) => (count as number) > 1)
      if (duplicates.length > 0) {
        console.warn('⚠️ Duplicate cards detected in database:', duplicates)
      }
      
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
          profile:player_id (
            email
          )
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
    // Prevent any card execution if one is already in progress
    if (cardExecutionInProgress.value) {
      console.warn('🚫 Card execution already in progress, blocking:', cardType)
      return { error: 'Card execution in progress' }
    }
    
    // Track if turn was already in progress (for target selection)
    const wasTurnAlreadyInProgress = turnInProgress.value
    
    // Only check canPlayCard for new card plays, not target selection scenarios
    if (!wasTurnAlreadyInProgress && !canPlayCard.value(cardType)) {
      console.warn('⚠️ Cannot play card:', cardType)
      console.log('Debug info:', {
        isMyTurn: isMyTurn.value,
        turnInProgress: turnInProgress.value,
        cardExecutionInProgress: cardExecutionInProgress.value,
        handCard: myHand.value.find(h => h.card_type === cardType),
        myPigsCount: myPigs.value.length,
        otherPigsCount: otherPlayersPigs.value.length,
        gameState: !!gameState.value
      })
      
      // Log specific card requirements
      if (cardType === 'mud') {
        const cleanPigsWithoutBarn = myPigs.value.filter(pig => pig.pig_state === 'clean' && !pig.has_barn)
        console.log('Mud card requirements: Clean pigs without barn:', cleanPigsWithoutBarn.length, cleanPigsWithoutBarn)
      } else if (cardType === 'bath') {
        const validTargets = otherPlayersPigs.value.filter(pig => pig.pig_state === 'dirty' && (!pig.has_barn || !pig.barn_locked))
        console.log('Bath card requirements: Dirty pigs that can be washed:', validTargets.length, validTargets)
      }
      
      return { error: 'Cannot play this card' }
    }

    // NOW set the card execution flag after validation passes
    cardExecutionInProgress.value = true
    console.log('🔒 Card execution started:', cardType)
    
    // If turn is not in progress, set it now (for direct plays)
    if (!wasTurnAlreadyInProgress) {
      turnInProgress.value = true
    }
    
    if (!gameState.value || !authStore.user) {
      turnInProgress.value = false
      cardExecutionInProgress.value = false
      return { error: 'Game not initialized or user not authenticated' }
    }
    
    // Double-check it's the player's turn
    if (!isMyTurn.value) {
      console.warn('⚠️ Not player turn. Current:', gameState.value.current_player_order, 'Player:', myPlayerOrder.value)
      turnInProgress.value = false
      cardExecutionInProgress.value = false
      return { error: 'It is not your turn' }
    }
    
    // Verify turn on server side
    const { data: isValidTurn, error: turnError } = await supabase.rpc('is_player_turn', {
      room_id_param: gameState.value.room_id,
      player_id_param: authStore.user.id
    })
    
    if (turnError || !isValidTurn) {
      console.error('❌ Server-side turn validation failed:', turnError)
      turnInProgress.value = false
      cardExecutionInProgress.value = false
      return { error: 'Turn validation failed' }
    }
    
    try {
      console.log('🎴 Playing card:', cardType, 'Target pig:', targetPig?.id, 'Turn was in progress:', wasTurnAlreadyInProgress)
      
      // Execute card effect based on type
      await executeCardEffect(cardType, targetPig)
      
      // Remove card from hand
      await removeCardFromHand(cardType)
      
      // Draw new card
      await drawCard()
      
      // Check for win condition
      if (hasWon.value) {
        console.log('🎉 Player won! Ending game...')
        await endGame()
      } else {
        // End turn
        console.log('🔄 Ending turn after card play')
        await endTurn()
      }
      
      return { error: null }
      
    } catch (err: any) {
      console.error('❌ Error playing card:', err)
      error.value = err.message
      // Reset flags on error
      turnInProgress.value = false
      cardExecutionInProgress.value = false
      return { error: err.message }
    } finally {
      // Always reset card execution flag
      cardExecutionInProgress.value = false
      console.log('🔓 Card execution finished:', cardType)
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
    
    // Update local state immediately for instant feedback
    const pigIndex = playerPigs.value.findIndex(pig => pig.id === targetPig!.id)
    if (pigIndex !== -1) {
      playerPigs.value[pigIndex].pig_state = 'dirty'
      console.log('🔄 Immediately updated pig state locally:', targetPig.id)
    }
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ pig_state: 'dirty' })
      .eq('id', targetPig.id)
    
    if (error) {
      // Revert local change if database update fails
      if (pigIndex !== -1) {
        playerPigs.value[pigIndex].pig_state = 'clean'
      }
      throw error
    }
    
    // Play "Drecksau!" sound effect (mock)
    console.log('🐷 Drecksau!')
  }

  const applyBarnCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = myPigs.value.find(pig => !pig.has_barn)
    }
    
    if (!targetPig) throw new Error('No valid pig for barn')
    
    // Update local state immediately
    const pigIndex = playerPigs.value.findIndex(pig => pig.id === targetPig!.id)
    if (pigIndex !== -1) {
      playerPigs.value[pigIndex].has_barn = true
      console.log('🔄 Immediately updated barn state locally:', targetPig.id)
    }
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ has_barn: true })
      .eq('id', targetPig.id)
    
    if (error) {
      // Revert local change if database update fails
      if (pigIndex !== -1) {
        playerPigs.value[pigIndex].has_barn = false
      }
      throw error
    }
  }

  const applyBathCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      // Find first dirty pig from other players
      targetPig = otherPlayersPigs.value.find(pig => 
        pig.pig_state === 'dirty' && (!pig.has_barn || !pig.barn_locked)
      )
    }
    
    if (!targetPig) throw new Error('No valid pig to wash')
    
    // Update local state immediately
    const pigIndex = playerPigs.value.findIndex(pig => pig.id === targetPig!.id)
    if (pigIndex !== -1) {
      playerPigs.value[pigIndex].pig_state = 'clean'
      console.log('🔄 Immediately updated pig state to clean locally:', targetPig.id)
    }
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ pig_state: 'clean' })
      .eq('id', targetPig.id)
    
    if (error) {
      // Revert local change if database update fails
      if (pigIndex !== -1) {
        playerPigs.value[pigIndex].pig_state = 'dirty'
      }
      throw error
    }
  }

  const applyRainCard = async () => {
    // Update local state immediately for all affected pigs
    const affectedPigs = playerPigs.value.filter(pig => pig.pig_state === 'dirty' && !pig.has_barn)
    const originalStates = affectedPigs.map(pig => ({ id: pig.id, state: pig.pig_state }))
    
    affectedPigs.forEach(pig => {
      pig.pig_state = 'clean'
    })
    console.log('🔄 Immediately updated rain card effects locally')
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ pig_state: 'clean' })
      .eq('pig_state', 'dirty')
      .eq('has_barn', false)
    
    if (error) {
      // Revert local changes if database update fails
      originalStates.forEach(({ id, state }) => {
        const pig = playerPigs.value.find(p => p.id === id)
        if (pig) pig.pig_state = state as any
      })
      throw error
    }
  }

  const applyLightningCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = otherPlayersPigs.value.find(pig => 
        pig.has_barn && !pig.has_lightning_rod
      )
    }
    
    if (!targetPig) throw new Error('No valid barn to strike')
    
    // Update local state immediately
    const pigIndex = playerPigs.value.findIndex(pig => pig.id === targetPig!.id)
    if (pigIndex !== -1) {
      const oldBarn = playerPigs.value[pigIndex].has_barn
      const oldLock = playerPigs.value[pigIndex].barn_locked
      playerPigs.value[pigIndex].has_barn = false
      playerPigs.value[pigIndex].barn_locked = false
      console.log('🔄 Immediately updated lightning strike locally:', targetPig.id)
      
      const { error } = await supabase
        .from('player_pigs')
        .update({ 
          has_barn: false,
          barn_locked: false 
        })
        .eq('id', targetPig.id)
      
      if (error) {
        // Revert local changes if database update fails
        playerPigs.value[pigIndex].has_barn = oldBarn
        playerPigs.value[pigIndex].barn_locked = oldLock
        throw error
      }
    } else {
      const { error } = await supabase
        .from('player_pigs')
        .update({ 
          has_barn: false,
          barn_locked: false 
        })
        .eq('id', targetPig.id)
      
      if (error) throw error
    }
  }

  const applyLightningRodCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = myPigs.value.find(pig => pig.has_barn && !pig.has_lightning_rod)
    }
    
    if (!targetPig) throw new Error('No valid barn for lightning rod')
    
    // Update local state immediately
    const pigIndex = playerPigs.value.findIndex(pig => pig.id === targetPig!.id)
    if (pigIndex !== -1) {
      playerPigs.value[pigIndex].has_lightning_rod = true
      console.log('🔄 Immediately updated lightning rod locally:', targetPig.id)
    }
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ has_lightning_rod: true })
      .eq('id', targetPig.id)
    
    if (error) {
      // Revert local change if database update fails
      if (pigIndex !== -1) {
        playerPigs.value[pigIndex].has_lightning_rod = false
      }
      throw error
    }
  }

  const applyBarnLockCard = async (targetPig?: PlayerPig) => {
    if (!targetPig) {
      targetPig = myPigs.value.find(pig => 
        pig.has_barn && pig.pig_state === 'dirty' && !pig.barn_locked
      )
    }
    
    if (!targetPig) throw new Error('No valid barn to lock')
    
    // Update local state immediately
    const pigIndex = playerPigs.value.findIndex(pig => pig.id === targetPig!.id)
    if (pigIndex !== -1) {
      playerPigs.value[pigIndex].barn_locked = true
      console.log('🔄 Immediately updated barn lock locally:', targetPig.id)
    }
    
    const { error } = await supabase
      .from('player_pigs')
      .update({ barn_locked: true })
      .eq('id', targetPig.id)
    
    if (error) {
      // Revert local change if database update fails
      if (pigIndex !== -1) {
        playerPigs.value[pigIndex].barn_locked = false
      }
      throw error
    }
  }

  const removeCardFromHand = async (cardType: CardType) => {
    const handCard = myHand.value.find(h => h.card_type === cardType)
    if (!handCard) return
    
    // Update local state immediately
    const handIndex = playerHands.value.findIndex(h => h.id === handCard.id)
    if (handCard.card_count > 1) {
      // Decrease card count locally
      if (handIndex !== -1) {
        const originalCount = playerHands.value[handIndex].card_count
        playerHands.value[handIndex].card_count = originalCount - 1
        console.log('🔄 Immediately decreased card count locally:', cardType)
        
        const { error } = await supabase
          .from('player_hands')
          .update({ card_count: handCard.card_count - 1 })
          .eq('id', handCard.id)
        
        if (error) {
          // Revert local change
          playerHands.value[handIndex].card_count = originalCount
          throw error
        }
      }
    } else {
      // Remove card from hand locally
      if (handIndex !== -1) {
        const removedCard = playerHands.value[handIndex]
        playerHands.value.splice(handIndex, 1)
        console.log('🔄 Immediately removed card from hand locally:', cardType)
        
        const { error } = await supabase
          .from('player_hands')
          .delete()
          .eq('id', handCard.id)
        
        if (error) {
          // Revert local change
          playerHands.value.splice(handIndex, 0, removedCard)
          throw error
        }
      }
    }
  }

  const drawCard = async () => {
    if (!gameState.value || !authStore.user) return
    
    console.log('🃏 Drawing card from deck...')
    
    const { data, error } = await supabase.rpc('draw_card', {
      room_id_param: gameState.value.room_id,
      player_id_param: authStore.user.id
    })
    
    if (error) throw error
    
    // Immediately refresh player hand to show the new card
    const { data: handsData, error: handsError } = await supabase
      .from('player_hands')
      .select('*')
      .eq('room_id', gameState.value.room_id)
      .eq('player_id', authStore.user.id)
    
    if (handsError) {
      console.error('❌ Error refreshing hand after draw:', handsError)
    } else {
      playerHands.value = handsData || []
      console.log('✅ Hand refreshed after drawing card, new count:', playerHands.value.length)
    }
    
    return data
  }

  const discardAllCards = async () => {
    if (!canDiscardAllCards.value) {
      return { error: 'Cannot discard all cards - not all conditions met' }
    }
    
    // Set turn in progress
    turnInProgress.value = true
    
    try {
      console.log('🗑️ Discarding all cards - showing to other players')
      
      // Show cards to other players (broadcast action)
      const cardsList = myHand.value.filter(h => h.card_count > 0).map(h => `${h.card_type}(${h.card_count})`).join(', ')
      lastAction.value = `모든 카드 공개 후 버림: ${cardsList}`
      showCardEffect.value = true
      
      // Remove all cards from hand
      const { error: deleteError } = await supabase
        .from('player_hands')
        .delete()
        .eq('room_id', gameState.value!.room_id)
        .eq('player_id', authStore.user!.id)
      
      if (deleteError) throw deleteError
      
      // Clear local hand state
      playerHands.value = []
      
      // Draw 3 new cards
      for (let i = 0; i < 3; i++) {
        await drawCard()
      }
      
      // End turn (this completes the action, no additional card draw)  
      await endTurnWithoutDraw()
      
      // Hide the card effect after a delay
      setTimeout(() => {
        showCardEffect.value = false
      }, 4000)
      
      console.log('✅ All cards discarded and redrawn successfully')
      return { error: null }
      
    } catch (err: any) {
      console.error('❌ Error discarding all cards:', err)
      turnInProgress.value = false
      showCardEffect.value = false
      return { error: err.message }
    }
  }

  // Helper function to get card display name
  const getCardDisplayName = (cardType: CardType): string => {
    const cardNames = {
      'mud': '진흙카드',
      'rain': '비카드', 
      'lightning': '벼락카드',
      'lightning_rod': '피뢰침카드',
      'barn': '헛간카드',
      'barn_lock': '헛간잠금카드',
      'bath': '목욕카드',
      'beautiful_pig': '아름다운돼지카드',
      'escape': '탈출카드',
      'lucky_bird': '행운의새카드'
    }
    return cardNames[cardType] || cardType
  }

  const discardCard = async (cardType: CardType) => {
    if (!isMyTurn.value) {
      return { error: 'Not your turn' }
    }
    
    const handCard = myHand.value.find(h => h.card_type === cardType)
    if (!handCard || handCard.card_count <= 0) {
      return { error: 'Card not available in hand' }
    }
    
    // Set turn in progress
    turnInProgress.value = true
    
    try {
      console.log('🗑️ Discarding single card:', cardType, 'current count:', handCard.card_count)
      
      const originalCount = handCard.card_count
      const newCount = originalCount - 1
      
      // Update database first with the correct new count
      const { error: updateError } = await supabase
        .from('player_hands')
        .update({ 
          card_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', gameState.value!.room_id)
        .eq('player_id', authStore.user!.id)
        .eq('card_type', cardType)
      
      if (updateError) {
        throw updateError
      }
      
      // Update local state only after database success
      handCard.card_count = newCount
      
      // Draw 1 new card to maintain hand size
      await drawCard()
      
      // End turn (this completes the action, no additional card draw)
      await endTurnWithoutDraw()
      
      // Show visual feedback
      showCardEffect.value = true
      lastAction.value = `카드 1장 버림: ${getCardDisplayName(cardType)}`
      setTimeout(() => {
        showCardEffect.value = false
      }, 3000)
      
      console.log('✅ Single card discarded successfully:', cardType, 'new count:', newCount)
      return { error: null }
      
    } catch (err: any) {
      console.error('❌ Error discarding single card:', err)
      turnInProgress.value = false
      return { error: err.message }
    }
  }

  const endTurn = async () => {
    if (!gameState.value) {
      console.log('⚠️ endTurn: No game state')
      return
    }
    
    console.log('🔄 Starting endTurn, current player:', gameState.value.current_player_order)
    
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
    
    console.log('🔄 Changing turn from', currentOrder, 'to', nextOrder)
    
    // Update game state
    const { error } = await supabase
      .from('game_states')
      .update({ current_player_order: nextOrder })
      .eq('room_id', gameState.value.room_id)
    
    if (error) {
      console.error('❌ Error updating game state in endTurn:', error)
      throw error
    }
    
    console.log('✅ Turn ended successfully, next player:', nextOrder)
    
    // Update local game state immediately (don't wait for realtime update)
    gameState.value.current_player_order = nextOrder
    console.log('🔄 Local game state updated immediately, current player:', gameState.value.current_player_order)
    
    // Reset turn in progress flag
    turnInProgress.value = false
  }

  const endTurnWithoutDraw = async () => {
    // Same as endTurn but doesn't trigger card drawing
    await endTurn()
  }

  const endGame = async () => {
    if (!gameState.value || !authStore.user) return
    
    try {
      console.log('🏆 Ending game, updating game state to finished...')
      
      // Update game state to finished with winner information
      const { error: gameStateError } = await supabase
        .from('game_states')
        .update({
          game_phase: 'finished',
          winner_player_id: authStore.user.id,
          finished_at: new Date().toISOString()
        })
        .eq('room_id', gameState.value.room_id)
      
      if (gameStateError) throw gameStateError
      
      // Update local game state immediately
      gameState.value.game_phase = 'finished'
      gameState.value.winner_player_id = authStore.user.id
      console.log('🏆 Game state updated to finished locally')
      
      // Broadcast game end to all players
      if (gameChannel) {
        await gameChannel.send({
          type: 'broadcast',
          event: 'game_finished',
          payload: {
            winner_player_id: authStore.user.id,
            winner_name: authStore.user.email?.split('@')[0] || 'Unknown',
            win_condition: winConditionType.value,
            finished_at: new Date().toISOString()
          }
        })
        console.log('📡 Game finished broadcast sent')
      }
      
      // Call the check_game_winner function for any additional processing
      const { data, error } = await supabase.rpc('check_game_winner', {
        room_id_param: gameState.value.room_id,
        player_id_param: authStore.user.id
      })
      
      if (error) console.warn('Warning in check_game_winner:', error)
      return data
      
    } catch (err: any) {
      console.error('❌ Error ending game:', err)
      throw err
    }
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
    console.log('🎮 Game state update received:', payload)
    
    if (payload.eventType === 'UPDATE' && payload.new) {
      const oldCurrentPlayer = gameState.value?.current_player_order
      const newCurrentPlayer = payload.new.current_player_order
      
      console.log('🔄 Game state update: turn changing from', oldCurrentPlayer, 'to', newCurrentPlayer)
      
      gameState.value = payload.new
      
      // Reset turn in progress when turn changes to someone else
      if (oldCurrentPlayer && oldCurrentPlayer !== newCurrentPlayer && newCurrentPlayer !== myPlayerOrder.value) {
        turnInProgress.value = false
        console.log('🔄 Turn in progress reset for player', myPlayerOrder.value)
      }
      
      // Check if it's now my turn
      if (newCurrentPlayer === myPlayerOrder.value) {
        console.log('🎯 It is now my turn! Player order:', myPlayerOrder.value)
      } else {
        console.log('⏳ Waiting for turn. Current:', newCurrentPlayer, 'My order:', myPlayerOrder.value)
      }
    } else if (payload.eventType === 'DELETE') {
      console.log('🗑️ Game state deleted')
      gameState.value = null
      turnInProgress.value = false
    }
  }

  const handlePlayerPigsUpdate = async (payload: any) => {
    console.log('🐷 Player pigs update:', payload.eventType, {
      new: payload.new ? {
        id: payload.new.id?.slice(0, 8),
        player_id: payload.new.player_id?.slice(0, 8),
        pig_state: payload.new.pig_state,
        has_barn: payload.new.has_barn
      } : null,
      old: payload.old ? {
        id: payload.old.id?.slice(0, 8),
        player_id: payload.old.player_id?.slice(0, 8),
        pig_state: payload.old.pig_state
      } : null
    })
    
    if (payload.eventType === 'INSERT' && payload.new) {
      const existingIndex = playerPigs.value.findIndex(pig => pig.id === payload.new.id)
      if (existingIndex === -1) {
        playerPigs.value.push(payload.new)
        console.log('✅ Added new pig to playerPigs')
      } else {
        console.log('⚠️ Pig already exists, not adding')
      }
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      const index = playerPigs.value.findIndex(pig => pig.id === payload.new.id)
      if (index !== -1) {
        const oldState = playerPigs.value[index].pig_state
        playerPigs.value[index] = payload.new
        console.log('✅ Updated pig in playerPigs:', {
          id: payload.new.id?.slice(0, 8),
          oldState,
          newState: payload.new.pig_state
        })
      } else {
        console.log('⚠️ Pig not found for update, adding:', payload.new.id?.slice(0, 8))
        playerPigs.value.push(payload.new)
      }
    } else if (payload.eventType === 'DELETE' && payload.old) {
      const index = playerPigs.value.findIndex(pig => pig.id === payload.old.id)
      if (index !== -1) {
        playerPigs.value.splice(index, 1)
        console.log('✅ Removed pig from playerPigs')
      }
    }
    
    // Log current state after update
    console.log('🔍 Current playerPigs count:', playerPigs.value.length)
    console.log('🔍 Other players pigs:', otherPlayersPigs.value.map(p => ({
      id: p.id?.slice(0, 8),
      player_id: p.player_id?.slice(0, 8),
      pig_state: p.pig_state
    })))
  }

  const handlePlayerHandsUpdate = async (payload: any) => {
    console.log('🃏 Player hands update:', payload.eventType, {
      new_id: payload.new?.id?.slice(0, 8),
      new_player_id: payload.new?.player_id?.slice(0, 8),
      new_card_type: payload.new?.card_type,
      new_card_count: payload.new?.card_count,
      old_id: payload.old?.id?.slice(0, 8)
    })
    
    // Only update our own hand for security
    if (payload.new?.player_id !== authStore.user?.id && payload.old?.player_id !== authStore.user?.id) return
    
    if (payload.eventType === 'INSERT' && payload.new) {
      // Check for existing entry by ID first (most reliable)
      const existingByIdIndex = playerHands.value.findIndex(hand => hand.id === payload.new.id)
      
      if (existingByIdIndex === -1) {
        playerHands.value.push(payload.new)
        console.log('✅ Added new hand card to local state:', payload.new.card_type)
      } else {
        // Update existing entry
        playerHands.value[existingByIdIndex] = payload.new
        console.log('🔄 Updated existing hand card in local state:', payload.new.card_type)
      }
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      const index = playerHands.value.findIndex(hand => 
        hand.id === payload.new.id
      )
      if (index !== -1) {
        playerHands.value[index] = payload.new
        console.log('🔄 Updated hand card in local state:', payload.new.card_type)
      } else {
        console.warn('⚠️ Could not find hand card to update:', payload.new.id)
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
    
    const { action, player_id, target_pig_id } = payload.payload
    
    // Apply immediate state changes for other players' actions
    if (player_id !== authStore.user?.id && target_pig_id) {
      console.log('🔄 Applying broadcast action from other player:', { action, target_pig_id })
      
      const pigIndex = playerPigs.value.findIndex(pig => pig.id === target_pig_id)
      if (pigIndex !== -1) {
        const targetPig = playerPigs.value[pigIndex]
        console.log('🎯 Found target pig for broadcast update:', {
          pigId: target_pig_id.slice(0, 8),
          currentState: targetPig.pig_state,
          action
        })
        
        switch (action) {
          case 'mud':
            playerPigs.value[pigIndex].pig_state = 'dirty'
            console.log('🔄 Broadcast: Updated pig to dirty')
            break
          case 'bath':
            playerPigs.value[pigIndex].pig_state = 'clean'
            console.log('🔄 Broadcast: Updated pig to clean')
            break
          case 'barn':
            playerPigs.value[pigIndex].has_barn = true
            console.log('🔄 Broadcast: Added barn to pig')
            break
          case 'lightning':
            playerPigs.value[pigIndex].has_barn = false
            playerPigs.value[pigIndex].barn_locked = false
            console.log('🔄 Broadcast: Removed barn from pig')
            break
          case 'lightning_rod':
            playerPigs.value[pigIndex].has_lightning_rod = true
            console.log('🔄 Broadcast: Added lightning rod to pig')
            break
          case 'barn_lock':
            playerPigs.value[pigIndex].barn_locked = true
            console.log('🔄 Broadcast: Locked barn')
            break
        }
      } else {
        console.log('⚠️ Target pig not found for broadcast update:', target_pig_id)
      }
    }
    
    // Handle rain card separately (affects multiple pigs)
    if (player_id !== authStore.user?.id && action === 'rain') {
      console.log('🔄 Applying rain card broadcast effect')
      playerPigs.value.forEach((pig, index) => {
        if (pig.pig_state === 'dirty' && !pig.has_barn) {
          playerPigs.value[index].pig_state = 'clean'
          console.log('🔄 Broadcast: Rain cleaned pig:', pig.id.slice(0, 8))
        }
      })
    }
    
    // Show visual feedback for actions by other players
    if (player_id !== authStore.user?.id) {
      lastAction.value = `다른 플레이어가 ${action}을(를) 사용했습니다!`
      showCardEffect.value = true
      
      setTimeout(() => {
        showCardEffect.value = false
      }, 2000)
    }
  }

  const handleGameFinishedBroadcast = async (payload: any) => {
    console.log('📡 Game finished broadcast received:', payload)
    
    const { winner_player_id, winner_name } = payload.payload
    
    // Only show victory modal to other players (winner already sees it)
    if (winner_player_id !== authStore.user?.id) {
      console.log('🏆 Another player won! Setting up victory modal for winner:', winner_name)
      
      // Update local game state
      if (gameState.value) {
        gameState.value.game_phase = 'finished'
        gameState.value.winner_player_id = winner_player_id
      }
      
      // Show notification that another player won
      lastAction.value = `🏆 ${winner_name}님이 게임에서 승리했습니다!`
      showCardEffect.value = true
      
      // Keep the notification longer for game end
      setTimeout(() => {
        showCardEffect.value = false
      }, 5000)
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
      .on('broadcast', {
        event: 'game_finished'
      }, handleGameFinishedBroadcast)
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to game updates')
          isConnected.value = true
          connectionError.value = ''
          
          // Start polling as backup (every 2 seconds)
          startGameStatePolling(roomId)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to game updates')
          isConnected.value = false
          connectionError.value = 'Failed to connect to real-time updates'
          error.value = 'Failed to connect to real-time updates'
        } else if (status === 'CLOSED') {
          console.log('🔌 Connection closed')
          isConnected.value = false
          stopGameStatePolling()
        }
      })
  }

  // Backup polling mechanism
  const startGameStatePolling = (roomId: string) => {
    // Clear any existing polling
    stopGameStatePolling()
    
    console.log('🔄 Starting game state polling backup')
    gameStatePollingInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('game_states')
          .select('*')
          .eq('room_id', roomId)
          .single()
        
        if (error) {
          console.error('⚠️ Polling error:', error)
          return
        }
        
        if (data && gameState.value) {
          // Check if state has changed
          if (data.current_player_order !== gameState.value.current_player_order) {
            console.log('🔄 Polling detected state change:', data.current_player_order)
            
            // Simulate realtime update
            handleGameStateUpdate({
              eventType: 'UPDATE',
              new: data,
              old: gameState.value
            })
          }
        }
      } catch (err) {
        console.error('⚠️ Polling exception:', err)
      }
    }, 2000) // Poll every 2 seconds
  }
  
  const stopGameStatePolling = () => {
    if (gameStatePollingInterval) {
      console.log('🔄 Stopping game state polling')
      clearInterval(gameStatePollingInterval)
      gameStatePollingInterval = null
    }
  }

  const stopGameSubscription = () => {
    if (gameChannel) {
      console.log('🔌 Unsubscribing from game updates')
      gameChannel.unsubscribe()
      gameChannel = null
      isConnected.value = false
    }
    stopGameStatePolling()
  }

  // Safe cleanup when user leaves the game
  const safeCleanupOnLeave = async () => {
    if (!gameState.value || !authStore.user) return

    try {
      console.log('🧹 Safe cleanup initiated for user leaving game')
      
      // If game is in progress and it's my turn, end turn first
      if (gameState.value.game_phase === 'playing' && isMyTurn.value && turnInProgress.value) {
        console.log('⏭️ Auto-ending turn as user is leaving')
        try {
          await endTurn()
        } catch (err) {
          console.warn('Could not end turn during cleanup:', err)
        }
      }

      // Mark player as inactive/disconnected but don't remove from game
      // This allows them to reconnect later
      console.log('🔄 Marking player as temporarily disconnected')
      
    } catch (err) {
      console.error('❌ Error during safe cleanup:', err)
    } finally {
      // Always clean up local state
      cleanup()
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
    turnInProgress.value = false
    cardExecutionInProgress.value = false
    error.value = ''
    stopGameSubscription()
    stopGameStatePolling()
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
    turnInProgress,
    cardExecutionInProgress,
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
    canDiscardAllCards,
    hasWon,
    winConditionType,
    isGameFinished,
    isWinner,
    winnerInfo,
    
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
    safeCleanupOnLeave,
    cleanup
  }
})