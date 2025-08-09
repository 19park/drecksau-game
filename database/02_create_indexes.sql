-- 드렉사우 게임 데이터베이스 - 인덱스 생성
-- 성능 최적화를 위한 인덱스 생성

-- 게임방 관련 인덱스
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_creator ON rooms(creator_id);
CREATE INDEX idx_rooms_created_at ON rooms(created_at);

-- 게임방 플레이어 관련 인덱스  
CREATE INDEX idx_room_players_room_id ON room_players(room_id);
CREATE INDEX idx_room_players_player_id ON room_players(player_id);
CREATE INDEX idx_room_players_order ON room_players(room_id, player_order);

-- 게임 상태 관련 인덱스
CREATE INDEX idx_game_states_room_id ON game_states(room_id);
CREATE INDEX idx_game_states_phase ON game_states(game_phase);

-- 플레이어 돼지 관련 인덱스
CREATE INDEX idx_player_pigs_room_player ON player_pigs(room_id, player_id);
CREATE INDEX idx_player_pigs_state ON player_pigs(pig_state);

-- 플레이어 손패 관련 인덱스
CREATE INDEX idx_player_hands_room_player ON player_hands(room_id, player_id);
CREATE INDEX idx_player_hands_card_type ON player_hands(card_type);

-- 게임 덱 관련 인덱스
CREATE INDEX idx_game_deck_room_id ON game_deck(room_id);
CREATE INDEX idx_game_deck_remaining ON game_deck(remaining_count);

-- 게임 로그 관련 인덱스
CREATE INDEX idx_game_logs_room_id ON game_logs(room_id);
CREATE INDEX idx_game_logs_player_id ON game_logs(player_id);
CREATE INDEX idx_game_logs_created_at ON game_logs(created_at);
CREATE INDEX idx_game_logs_action_type ON game_logs(action_type);

-- 토너먼트 관련 인덱스
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_creator ON tournaments(creator_id);
CREATE INDEX idx_tournaments_created_at ON tournaments(created_at);

-- 토너먼트 플레이어 관련 인덱스
CREATE INDEX idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_players_player_id ON tournament_players(player_id);
CREATE INDEX idx_tournament_players_total_score ON tournament_players(total_score DESC);