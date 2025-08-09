import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import type { Room, RoomPlayer } from '@/types/game'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useRoomsStore = defineStore('rooms', () => {
  const authStore = useAuthStore()
  
  const rooms = ref<Room[]>([])
  const currentRoom = ref<Room | null>(null)
  const roomPlayers = ref<RoomPlayer[]>([])
  const loading = ref(false)
  const error = ref('')
  
  let roomsChannel: RealtimeChannel | null = null
  let currentRoomChannel: RealtimeChannel | null = null

  // Computed
  const availableRooms = computed(() => 
    rooms.value.filter(room => room.status === 'waiting' && room.current_players < room.max_players)
  )

  const myRooms = computed(() =>
    rooms.value.filter(room => room.creator_id === authStore.user?.id)
  )

  const isRoomCreator = computed(() => 
    currentRoom.value?.creator_id === authStore.user?.id
  )

  const currentPlayer = computed(() =>
    roomPlayers.value.find(player => player.player_id === authStore.user?.id)
  )

  const canStartGame = computed(() =>
    isRoomCreator.value && 
    roomPlayers.value.length >= 2 && 
    roomPlayers.value.every(player => player.is_ready) &&
    currentRoom.value?.status === 'waiting'
  )

  // Actions
  const fetchRooms = async () => {
    loading.value = true
    error.value = ''
    
    try {
      console.log('🔍 Fetching rooms...')
      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.error('❌ Error fetching rooms:', fetchError)
        throw fetchError
      }
      
      console.log('✅ Rooms fetched:', data?.length || 0, 'rooms')
      console.log('📋 Room list:', data?.map(r => ({ id: r.id.slice(0, 8), name: r.name, current: r.current_players })))
      rooms.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('❌ Error fetching rooms:', err)
    } finally {
      loading.value = false
    }
  }

  const createRoom = async (name: string, maxPlayers: number = 4, isExpansion: boolean = false) => {
    if (!authStore.user) return { error: 'Not authenticated' }
    
    loading.value = true
    error.value = ''
    
    try {
      console.log('🏠 Creating room:', { name, maxPlayers, isExpansion })
      
      const { data, error: createError } = await supabase
        .from('rooms')
        .insert({
          name,
          max_players: maxPlayers,
          creator_id: authStore.user.id,
          is_expansion: isExpansion
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating room:', createError)
        throw createError
      }
      
      console.log('✅ Room created:', data.id)
      
      // Join the created room
      const joinResult = await joinRoom(data.id)
      if (joinResult.error) {
        console.error('❌ Error joining created room:', joinResult.error)
        throw new Error(joinResult.error)
      }
      
      console.log('✅ Successfully joined created room')
      
      // Refresh room list to show updated data
      await fetchRooms()
      
      return { data, error: null }
      
    } catch (err: any) {
      console.error('❌ Create room failed:', err)
      error.value = err.message
      return { data: null, error: err.message }
    } finally {
      loading.value = false
    }
  }

  const joinRoom = async (roomId: string) => {
    if (!authStore.user) return { error: 'Not authenticated' }
    
    loading.value = true
    error.value = ''
    
    try {
      // Check if room is joinable
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*, room_players(*)')
        .eq('id', roomId)
        .single()
      
      if (roomError) throw roomError
      
      if (room.status !== 'waiting') {
        throw new Error('게임방에 참가할 수 없습니다. (게임 진행 중)')
      }
      
      if (room.current_players >= room.max_players) {
        throw new Error('게임방이 가득 찼습니다.')
      }
      
      // Check if already joined
      const existingPlayer = room.room_players?.find((p: any) => p.player_id === authStore.user!.id)
      if (existingPlayer) {
        // Already joined, just load the room
        await loadRoom(roomId)
        return { error: null }
      }
      
      // Get the latest room_players data to avoid race conditions
      const { data: latestPlayers, error: playersError } = await supabase
        .from('room_players')
        .select('player_order')
        .eq('room_id', roomId)
        .order('player_order')
      
      if (playersError) throw playersError
      
      // Find next available player order more safely
      const usedOrders = latestPlayers?.map(p => p.player_order) || []
      let playerOrder = 1
      while (usedOrders.includes(playerOrder)) {
        playerOrder++
      }
      
      console.log('🎯 Joining room with player_order:', playerOrder, 'used orders:', usedOrders)
      
      // Join room
      const { error: joinError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomId,
          player_id: authStore.user.id,
          player_order: playerOrder
        })
      
      if (joinError) throw joinError
      
      await loadRoom(roomId)
      return { error: null }
      
    } catch (err: any) {
      error.value = err.message
      return { error: err.message }
    } finally {
      loading.value = false
    }
  }

  const leaveRoom = async (roomId?: string) => {
    if (!authStore.user) return { error: 'Not authenticated' }
    
    const targetRoomId = roomId || currentRoom.value?.id
    if (!targetRoomId) return { error: 'No room to leave' }
    
    try {
      const { error: leaveError } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', targetRoomId)
        .eq('player_id', authStore.user.id)
      
      if (leaveError) throw leaveError
      
      // Clean up current room state
      if (targetRoomId === currentRoom.value?.id) {
        currentRoom.value = null
        roomPlayers.value = []
        stopRoomSubscription()
      }
      
      await fetchRooms()
      return { error: null }
      
    } catch (err: any) {
      error.value = err.message
      return { error: err.message }
    }
  }

  const loadRoom = async (roomId: string) => {
    loading.value = true
    error.value = ''
    
    try {
      console.log('🔍 Loading room:', roomId)
      
      // Load room details
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      
      if (roomError) {
        console.error('❌ Error loading room:', roomError)
        throw roomError
      }
      
      currentRoom.value = room
      console.log('✅ Room loaded:', room.name)
      
      // Load room players with user details
      const { data: players, error: playersError } = await supabase
        .from('room_players')
        .select(`
          *,
          profile:player_id (
            email
          )
        `)
        .eq('room_id', roomId)
        .order('player_order')
      
      if (playersError) {
        console.error('❌ Error loading players:', playersError)
        throw playersError
      }
      
      roomPlayers.value = players || []
      console.log('✅ Players loaded:', players?.length || 0, 'players')
      console.log('👥 Players:', players?.map(p => ({ order: p.player_order, email: p.profile?.email })))
      
      // Check if current user is in the room
      const currentUserInRoom = players?.find(p => p.player_id === authStore.user?.id)
      if (currentUserInRoom) {
        console.log('✅ Current user found in room:', currentUserInRoom.player_order)
      } else {
        console.log('⚠️ Current user not found in room players')
      }
      
      // Start room subscription
      subscribeToRoom(roomId)
      
    } catch (err: any) {
      console.error('❌ Error loading room:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const toggleReady = async () => {
    if (!authStore.user || !currentRoom.value) return
    
    const player = currentPlayer.value
    if (!player) return
    
    try {
      const { error: updateError } = await supabase
        .from('room_players')
        .update({ is_ready: !player.is_ready })
        .eq('id', player.id)
      
      if (updateError) throw updateError
      
    } catch (err: any) {
      error.value = err.message
      console.error('Error toggling ready:', err)
    }
  }

  const startGame = async () => {
    if (!currentRoom.value || !isRoomCreator.value || !canStartGame.value) {
      return { error: 'Cannot start game' }
    }
    
    try {
      const { error: startError } = await supabase.rpc('start_game', {
        room_id_param: currentRoom.value.id
      })
      
      if (startError) throw startError
      
      return { error: null }
      
    } catch (err: any) {
      error.value = err.message
      return { error: err.message }
    }
  }

  // Realtime subscriptions
  const subscribeToRooms = () => {
    console.log('🔔 Subscribing to rooms updates...')
    
    roomsChannel = supabase
      .channel('public:rooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms' 
      }, (payload) => {
        console.log('🔔 Rooms table change:', payload.eventType, payload.new || payload.old)
        fetchRooms()
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'room_players' 
      }, (payload) => {
        console.log('🔔 Room players change:', payload.eventType, payload.new || payload.old)
        // Refresh rooms to update current_players count
        fetchRooms()
      })
      .subscribe((status) => {
        console.log('🔔 Rooms subscription status:', status)
      })
  }

  const subscribeToRoom = (roomId: string) => {
    if (currentRoomChannel) {
      currentRoomChannel.unsubscribe()
    }
    
    currentRoomChannel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadRoom(roomId)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, () => {
        loadRoom(roomId)
      })
      .subscribe()
  }

  const stopRoomsSubscription = () => {
    if (roomsChannel) {
      roomsChannel.unsubscribe()
      roomsChannel = null
    }
  }

  const stopRoomSubscription = () => {
    if (currentRoomChannel) {
      currentRoomChannel.unsubscribe()
      currentRoomChannel = null
    }
  }

  // Cleanup
  const cleanup = () => {
    rooms.value = []
    currentRoom.value = null
    roomPlayers.value = []
    error.value = ''
    stopRoomsSubscription()
    stopRoomSubscription()
  }

  return {
    // State
    rooms,
    currentRoom,
    roomPlayers,
    loading,
    error,
    
    // Computed
    availableRooms,
    myRooms,
    isRoomCreator,
    currentPlayer,
    canStartGame,
    
    // Actions
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    loadRoom,
    toggleReady,
    startGame,
    subscribeToRooms,
    subscribeToRoom,
    stopRoomsSubscription,
    stopRoomSubscription,
    cleanup
  }
})