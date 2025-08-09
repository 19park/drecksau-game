<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-game text-4xl text-primary-600 flex items-center gap-3">
          <span class="text-5xl">🏠</span>
          게임 로비
        </h1>
        <p class="text-gray-600 mt-2">친구들과 함께 드렉사우 게임을 즐겨보세요!</p>
      </div>
      
      <button 
        @click="showCreateRoom = true"
        class="btn-primary"
      >
        <span class="text-xl mr-2">➕</span>
        방 만들기
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card-base text-center">
        <div class="text-3xl mb-2">🎮</div>
        <div class="text-2xl font-bold text-primary-600">{{ rooms.length }}</div>
        <div class="text-gray-600">총 게임방</div>
      </div>
      
      <div class="card-base text-center">
        <div class="text-3xl mb-2">⏳</div>
        <div class="text-2xl font-bold text-secondary-600">{{ availableRooms.length }}</div>
        <div class="text-gray-600">참가 가능한 방</div>
      </div>
      
      <div class="card-base text-center">
        <div class="text-3xl mb-2">👑</div>
        <div class="text-2xl font-bold text-mud-600">{{ myRooms.length }}</div>
        <div class="text-gray-600">내가 만든 방</div>
      </div>
    </div>

    <!-- Room List -->
    <div class="card-base">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-display text-xl font-semibold">게임방 목록</h2>
        <button 
          @click="fetchRooms" 
          :disabled="loading"
          class="text-primary-600 hover:text-primary-800 transition-colors"
        >
          <span v-if="loading" class="loading-spinner"></span>
          <span v-else class="text-xl">🔄</span>
        </button>
      </div>
      
      <div v-if="error" class="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-lg">
        {{ error }}
      </div>
      
      <div v-if="loading && rooms.length === 0" class="text-center py-12">
        <div class="loading-spinner mx-auto mb-4"></div>
        <p class="text-gray-600">게임방을 불러오는 중...</p>
      </div>
      
      <div v-else-if="rooms.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">🏚️</div>
        <p class="text-gray-600 mb-4">아직 생성된 게임방이 없습니다.</p>
        <button @click="showCreateRoom = true" class="btn-primary">
          첫 번째 방 만들기
        </button>
      </div>
      
      <div v-else class="space-y-4">
        <div 
          v-for="room in rooms" 
          :key="room.id"
          class="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          :class="{
            'border-primary-200 bg-primary-50': room.creator_id === user?.id,
            'border-green-200 bg-green-50': room.status === 'playing',
            'border-gray-200 bg-gray-50': room.status === 'finished'
          }"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="text-2xl">
                {{ getRoomStatusEmoji(room.status) }}
              </div>
              
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold">{{ room.name }}</h3>
                  <span v-if="room.is_expansion" class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    확장판
                  </span>
                  <span v-if="room.creator_id === user?.id" class="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                    내 방
                  </span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>👥 {{ room.current_players }}/{{ room.max_players }}</span>
                  <span>{{ getRoomStatusText(room.status) }}</span>
                  <span>{{ formatDate(room.created_at) }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button
                v-if="room.status === 'waiting' && room.current_players < room.max_players"
                @click="joinRoom(room.id)"
                :disabled="loading"
                class="btn-secondary px-4 py-2 text-sm"
              >
                참가하기
              </button>
              
              <button
                v-else-if="room.status === 'playing' && room.creator_id === user?.id"
                @click="$router.push(`/game/${room.id}`)"
                class="btn-primary px-4 py-2 text-sm"
              >
                게임 입장
              </button>
              
              <button
                v-if="room.creator_id === user?.id && room.status === 'waiting'"
                @click="deleteRoom(room.id)"
                class="text-red-500 hover:text-red-700 p-2"
                title="방 삭제"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateRoom" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-display text-xl font-bold">새 게임방 만들기</h2>
          <button @click="closeCreateRoom" class="text-gray-400 hover:text-gray-600">
            <span class="text-2xl">×</span>
          </button>
        </div>
        
        <form @submit.prevent="handleCreateRoom" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              방 이름
            </label>
            <input
              v-model="newRoom.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="재밌는 드렉사우 게임"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              최대 플레이어 수
            </label>
            <select
              v-model="newRoom.maxPlayers"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="2">2명</option>
              <option value="3">3명</option>
              <option value="4">4명</option>
            </select>
          </div>
          
          <div class="flex items-center">
            <input
              v-model="newRoom.isExpansion"
              type="checkbox"
              id="expansion"
              class="mr-2 rounded focus:ring-primary-500"
            />
            <label for="expansion" class="text-sm text-gray-700">
              확장판 사용 (아름다운 돼지)
            </label>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button 
              type="button"
              @click="closeCreateRoom"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button 
              type="submit"
              :disabled="loading || !newRoom.name.trim()"
              class="flex-1 btn-primary"
            >
              <span v-if="loading" class="loading-spinner mr-2"></span>
              {{ loading ? '생성 중...' : '방 만들기' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomsStore } from '@/stores/rooms'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const roomsStore = useRoomsStore()
const authStore = useAuthStore()

// Reactive refs
const showCreateRoom = ref(false)
const newRoom = ref({
  name: '',
  maxPlayers: 4,
  isExpansion: false
})

// Computed
const { 
  rooms, 
  availableRooms, 
  myRooms, 
  loading, 
  error,
  fetchRooms,
  createRoom,
  joinRoom: joinRoomAction
} = roomsStore

const user = computed(() => authStore.user)

// Methods
const handleCreateRoom = async () => {
  const result = await createRoom(
    newRoom.value.name.trim(), 
    newRoom.value.maxPlayers, 
    newRoom.value.isExpansion
  )
  
  if (!result.error && result.data) {
    closeCreateRoom()
    router.push(`/room/${result.data.id}`)
  }
}

const joinRoom = async (roomId: string) => {
  const result = await joinRoomAction(roomId)
  if (!result.error) {
    router.push(`/room/${roomId}`)
  }
}

const deleteRoom = async (roomId: string) => {
  if (confirm('정말로 이 방을 삭제하시겠습니까?')) {
    // TODO: Implement room deletion
    console.log('Delete room:', roomId)
  }
}

const closeCreateRoom = () => {
  showCreateRoom.value = false
  newRoom.value = {
    name: '',
    maxPlayers: 4,
    isExpansion: false
  }
}

const getRoomStatusEmoji = (status: string) => {
  switch (status) {
    case 'waiting': return '⏳'
    case 'playing': return '🎮'
    case 'finished': return '🏁'
    default: return '🎯'
  }
}

const getRoomStatusText = (status: string) => {
  switch (status) {
    case 'waiting': return '대기 중'
    case 'playing': return '게임 중'
    case 'finished': return '종료됨'
    default: return '알 수 없음'
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`
  return date.toLocaleDateString()
}

// Lifecycle
onMounted(async () => {
  await fetchRooms()
  roomsStore.subscribeToRooms()
})

onUnmounted(() => {
  roomsStore.cleanup()
})
</script>