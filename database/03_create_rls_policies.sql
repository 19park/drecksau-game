-- 드렉사우 게임 데이터베이스 - RLS 정책 설정
-- Row Level Security 정책 생성

-- RLS (Row Level Security) 활성화
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_pigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_deck ENABLE ROW LEVEL SECURITY;
ALTER TABLE discarded_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;

-- 게임방 정책
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Users can create rooms" ON rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Room creators can update their rooms" ON rooms FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Room creators can delete their rooms" ON rooms FOR DELETE USING (auth.uid() = creator_id);

-- 방 플레이어 정책  
CREATE POLICY "Room players can view room_players" ON room_players FOR SELECT 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = room_players.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Users can join rooms" ON room_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Players can update their status" ON room_players FOR UPDATE USING (auth.uid() = player_id);
CREATE POLICY "Players can leave rooms" ON room_players FOR DELETE USING (auth.uid() = player_id);

-- 게임 상태 정책
CREATE POLICY "Room players can view game_states" ON game_states FOR SELECT 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_states.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can update game_states" ON game_states FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_states.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can insert game_states" ON game_states FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_states.room_id AND rp.player_id = auth.uid()));

-- 플레이어 돼지 정책
CREATE POLICY "Room players can view player_pigs" ON player_pigs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = player_pigs.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can update player_pigs" ON player_pigs FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = player_pigs.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can insert player_pigs" ON player_pigs FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = player_pigs.room_id AND rp.player_id = auth.uid()));

-- 손패 정책
CREATE POLICY "Players can view own hand" ON player_hands FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "Players can update own hand" ON player_hands FOR UPDATE USING (auth.uid() = player_id);
CREATE POLICY "Players can insert own hand" ON player_hands FOR INSERT WITH CHECK (auth.uid() = player_id);

-- 덱 정책  
CREATE POLICY "Room players can view deck" ON game_deck FOR SELECT 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_deck.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can update deck" ON game_deck FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_deck.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can insert deck" ON game_deck FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_deck.room_id AND rp.player_id = auth.uid()));

-- 버린카드 정책
CREATE POLICY "Room players can view discarded" ON discarded_cards FOR SELECT 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = discarded_cards.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can update discarded" ON discarded_cards FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = discarded_cards.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can insert discarded" ON discarded_cards FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = discarded_cards.room_id AND rp.player_id = auth.uid()));

-- 게임 로그 정책
CREATE POLICY "Room players can view logs" ON game_logs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_logs.room_id AND rp.player_id = auth.uid()));
CREATE POLICY "Room players can insert logs" ON game_logs FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM room_players rp WHERE rp.room_id = game_logs.room_id AND rp.player_id = auth.uid()));

-- 토너먼트 정책
CREATE POLICY "Anyone can view tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Users can create tournaments" ON tournaments FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Tournament creators can update" ON tournaments FOR UPDATE USING (auth.uid() = creator_id);

-- 토너먼트 플레이어 정책
CREATE POLICY "Tournament players can view tournament_players" ON tournament_players FOR SELECT 
    USING (EXISTS (SELECT 1 FROM tournament_players tp WHERE tp.tournament_id = tournament_players.tournament_id AND tp.player_id = auth.uid()));
CREATE POLICY "Users can join tournaments" ON tournament_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Players can update their tournament status" ON tournament_players FOR UPDATE USING (auth.uid() = player_id);