-- 드렉사우 게임 데이터베이스 - 트리거 함수들
-- 자동화된 데이터베이스 로직을 위한 트리거

-- 방 플레이어 수 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE rooms 
        SET current_players = current_players + 1,
            updated_at = NOW()
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE rooms 
        SET current_players = current_players - 1,
            updated_at = NOW()
        WHERE id = OLD.room_id;
        
        -- 방장이 나가면 다른 플레이어에게 방장 권한 이전
        UPDATE rooms 
        SET creator_id = (
            SELECT player_id 
            FROM room_players 
            WHERE room_id = OLD.room_id 
            ORDER BY joined_at ASC 
            LIMIT 1
        )
        WHERE id = OLD.room_id 
        AND creator_id = OLD.player_id
        AND EXISTS (SELECT 1 FROM room_players WHERE room_id = OLD.room_id);
        
        -- 방에 아무도 없으면 방 삭제
        DELETE FROM rooms 
        WHERE id = OLD.room_id 
        AND NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = OLD.room_id);
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_room_player_count
    AFTER INSERT OR DELETE ON room_players
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 적용
CREATE TRIGGER trigger_update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_game_states_updated_at
    BEFORE UPDATE ON game_states  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_player_pigs_updated_at
    BEFORE UPDATE ON player_pigs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_player_hands_updated_at
    BEFORE UPDATE ON player_hands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_game_deck_updated_at
    BEFORE UPDATE ON game_deck
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_discarded_cards_updated_at
    BEFORE UPDATE ON discarded_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tournaments_updated_at
    BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 플레이어 준비 상태 확인 트리거
CREATE OR REPLACE FUNCTION check_all_players_ready()
RETURNS TRIGGER AS $$
DECLARE
    total_players INTEGER;
    ready_players INTEGER;
    room_status VARCHAR(20);
BEGIN
    -- 방 상태 확인
    SELECT status INTO room_status FROM rooms WHERE id = NEW.room_id;
    
    -- 대기 중인 방에서만 체크
    IF room_status = 'waiting' THEN
        -- 총 플레이어 수와 준비된 플레이어 수 확인
        SELECT 
            COUNT(*), 
            COUNT(CASE WHEN is_ready = true THEN 1 END)
        INTO total_players, ready_players
        FROM room_players 
        WHERE room_id = NEW.room_id;
        
        -- 모든 플레이어가 준비되고 최소 2명 이상이면 게임 시작 가능 상태로 변경
        IF ready_players = total_players AND total_players >= 2 THEN
            -- 여기서 자동 시작하지 않고 방장이 시작 버튼을 누르도록 함
            -- 필요시 자동 시작하려면 start_game() 함수 호출
            NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_all_players_ready
    AFTER UPDATE ON room_players
    FOR EACH ROW
    WHEN (OLD.is_ready IS DISTINCT FROM NEW.is_ready)
    EXECUTE FUNCTION check_all_players_ready();

-- 게임 액션 로그 자동 생성 트리거
CREATE OR REPLACE FUNCTION log_pig_state_change()
RETURNS TRIGGER AS $$
DECLARE
    current_turn INTEGER;
    current_player UUID;
BEGIN
    -- 현재 턴 정보 가져오기
    SELECT 
        COALESCE(MAX(turn_number), 0),
        (SELECT player_id FROM room_players 
         WHERE room_id = NEW.room_id 
         AND player_order = (SELECT current_player_order FROM game_states WHERE room_id = NEW.room_id)
         LIMIT 1)
    INTO current_turn, current_player
    FROM game_logs WHERE room_id = NEW.room_id;
    
    -- 돼지 상태 변경 로그
    IF TG_OP = 'UPDATE' AND OLD.pig_state != NEW.pig_state THEN
        INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
        VALUES (NEW.room_id, current_player, 'pig_state_change', 
                jsonb_build_object(
                    'target_player', NEW.player_id,
                    'pig_index', NEW.pig_index,
                    'old_state', OLD.pig_state,
                    'new_state', NEW.pig_state
                ), current_turn);
    END IF;
    
    -- 헛간 상태 변경 로그
    IF TG_OP = 'UPDATE' AND (OLD.has_barn != NEW.has_barn OR OLD.barn_locked != NEW.barn_locked OR OLD.has_lightning_rod != NEW.has_lightning_rod) THEN
        INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
        VALUES (NEW.room_id, current_player, 'barn_state_change',
                jsonb_build_object(
                    'target_player', NEW.player_id,
                    'pig_index', NEW.pig_index,
                    'has_barn', NEW.has_barn,
                    'barn_locked', NEW.barn_locked,
                    'has_lightning_rod', NEW.has_lightning_rod
                ), current_turn);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_pig_state_change
    AFTER UPDATE ON player_pigs
    FOR EACH ROW EXECUTE FUNCTION log_pig_state_change();

-- 카드 사용 로그 트리거
CREATE OR REPLACE FUNCTION log_card_usage()
RETURNS TRIGGER AS $$
DECLARE
    current_turn INTEGER;
BEGIN
    -- 현재 턴 정보 가져오기
    SELECT COALESCE(MAX(turn_number), 0)
    INTO current_turn
    FROM game_logs WHERE room_id = NEW.room_id;
    
    -- 카드 사용 로그 (카드 수가 감소했을 때)
    IF TG_OP = 'UPDATE' AND OLD.card_count > NEW.card_count THEN
        INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
        VALUES (NEW.room_id, NEW.player_id, 'card_used',
                jsonb_build_object(
                    'card_type', NEW.card_type,
                    'cards_used', OLD.card_count - NEW.card_count
                ), current_turn);
    END IF;
    
    -- 카드 획득 로그 (카드 수가 증가했을 때)
    IF TG_OP = 'UPDATE' AND OLD.card_count < NEW.card_count THEN
        INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
        VALUES (NEW.room_id, NEW.player_id, 'card_drawn',
                jsonb_build_object(
                    'card_type', NEW.card_type,
                    'cards_drawn', NEW.card_count - OLD.card_count
                ), current_turn);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_card_usage
    AFTER UPDATE ON player_hands
    FOR EACH ROW EXECUTE FUNCTION log_card_usage();