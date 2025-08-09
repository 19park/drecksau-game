export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          name: string
          max_players: number
          current_players: number
          status: 'waiting' | 'playing' | 'finished'
          creator_id: string
          is_expansion: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          max_players?: number
          current_players?: number
          status?: 'waiting' | 'playing' | 'finished'
          creator_id: string
          is_expansion?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          max_players?: number
          current_players?: number
          status?: 'waiting' | 'playing' | 'finished'
          creator_id?: string
          is_expansion?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          player_id: string
          player_order: number
          is_ready: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          player_order: number
          is_ready?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          player_order?: number
          is_ready?: boolean
          joined_at?: string
        }
      }
      game_states: {
        Row: {
          room_id: string
          current_player_order: number
          game_phase: 'setup' | 'playing' | 'finished'
          winner_player_id: string | null
          deck_remaining: number
          started_at: string | null
          finished_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          room_id: string
          current_player_order?: number
          game_phase?: 'setup' | 'playing' | 'finished'
          winner_player_id?: string | null
          deck_remaining?: number
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          room_id?: string
          current_player_order?: number
          game_phase?: 'setup' | 'playing' | 'finished'
          winner_player_id?: string | null
          deck_remaining?: number
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      player_pigs: {
        Row: {
          id: string
          room_id: string
          player_id: string
          pig_index: number
          pig_state: 'clean' | 'dirty' | 'beautiful'
          has_barn: boolean
          barn_locked: boolean
          has_lightning_rod: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          pig_index: number
          pig_state?: 'clean' | 'dirty' | 'beautiful'
          has_barn?: boolean
          barn_locked?: boolean
          has_lightning_rod?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          pig_index?: number
          pig_state?: 'clean' | 'dirty' | 'beautiful'
          has_barn?: boolean
          barn_locked?: boolean
          has_lightning_rod?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      player_hands: {
        Row: {
          id: string
          room_id: string
          player_id: string
          card_type: string
          card_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          card_type: string
          card_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          card_type?: string
          card_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      start_game: {
        Args: { room_id_param: string }
        Returns: void
      }
      draw_card: {
        Args: { room_id_param: string; player_id_param: string }
        Returns: string
      }
      check_game_winner: {
        Args: { room_id_param: string; player_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      card_type: 'mud' | 'rain' | 'lightning' | 'lightning_rod' | 'barn' | 'barn_lock' | 'bath' | 'beautiful_pig' | 'escape' | 'lucky_bird'
    }
  }
}