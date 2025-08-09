export type CardType = 
  | 'mud'
  | 'rain' 
  | 'lightning'
  | 'lightning_rod'
  | 'barn'
  | 'barn_lock'
  | 'bath'
  | 'beautiful_pig'
  | 'escape'
  | 'lucky_bird'

export type PigState = 'clean' | 'dirty' | 'beautiful'

export type GamePhase = 'setup' | 'playing' | 'finished'

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface Room {
  id: string
  name: string
  max_players: number
  current_players: number
  status: RoomStatus
  creator_id: string
  is_expansion: boolean
  created_at: string
  updated_at: string
}

export interface RoomPlayer {
  id: string
  room_id: string
  player_id: string
  player_order: number
  is_ready: boolean
  joined_at: string
  user?: {
    email: string
  }
}

export interface GameState {
  room_id: string
  current_player_order: number
  game_phase: GamePhase
  winner_player_id?: string
  deck_remaining: number
  started_at?: string
  finished_at?: string
  created_at: string
  updated_at: string
}

export interface PlayerPig {
  id: string
  room_id: string
  player_id: string
  pig_index: number
  pig_state: PigState
  has_barn: boolean
  barn_locked: boolean
  has_lightning_rod: boolean
  created_at: string
  updated_at: string
}

export interface PlayerHand {
  id: string
  room_id: string
  player_id: string
  card_type: CardType
  card_count: number
  created_at: string
  updated_at: string
}

export interface GameDeck {
  room_id: string
  card_type: CardType
  remaining_count: number
  created_at: string
  updated_at: string
}

export interface DiscardedCard {
  room_id: string
  card_type: CardType
  discarded_count: number
  created_at: string
  updated_at: string
}

export interface GameLog {
  id: string
  room_id: string
  player_id: string
  action_type: string
  action_details: any
  turn_number: number
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  max_rounds: number
  current_round: number
  status: 'waiting' | 'active' | 'finished'
  creator_id: string
  created_at: string
  updated_at: string
}

export interface TournamentPlayer {
  id: string
  tournament_id: string
  player_id: string
  bucket_tokens: number
  trophy_tokens: number
  total_score: number
  joined_at: string
}

// Real-time message types
export interface GameMessage {
  type: 'game_update' | 'player_action' | 'game_start' | 'game_end' | 'turn_change'
  data: any
  timestamp: string
  player_id?: string
}

// Action types for game logic
export type GameAction = 
  | { type: 'play_card'; card_type: CardType; target?: { player_id: string; pig_index?: number } }
  | { type: 'discard_card'; card_type: CardType }
  | { type: 'draw_card' }
  | { type: 'end_turn' }
  | { type: 'ready_player' }

// UI State types
export interface GameUIState {
  selectedCard?: CardType
  selectedTarget?: { player_id: string; pig_index?: number }
  showCardSelector: boolean
  showTargetSelector: boolean
  isMyTurn: boolean
  canPlayCard: boolean
}

// Card definitions
export const CARD_CONFIGS: Record<CardType, { name: string; count: number; expansion?: boolean; emoji: string }> = {
  mud: { name: '진흙', count: 21, emoji: '💩' },
  rain: { name: '비', count: 4, emoji: '🌧️' },
  lightning: { name: '벼락', count: 4, emoji: '⚡' },
  lightning_rod: { name: '피뢰침', count: 4, emoji: '🔌' },
  barn: { name: '헛간', count: 9, emoji: '🏠' },
  barn_lock: { name: '헛간잠금', count: 4, emoji: '🔒' },
  bath: { name: '목욕', count: 8, emoji: '🛁' },
  beautiful_pig: { name: '아름다운 돼지', count: 16, expansion: true, emoji: '💄' },
  escape: { name: '도망', count: 12, expansion: true, emoji: '🏃' },
  lucky_bird: { name: '행운의 새', count: 4, expansion: true, emoji: '🐦' }
}