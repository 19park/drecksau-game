-- Fix Drecksau pig count rules based on number of players
-- According to official rules:
-- 2 players: 5 pigs each
-- 3 players: 4 pigs each
-- 4 players: 3 pigs each

-- Update the start_game function to use correct pig counts
CREATE OR REPLACE FUNCTION start_game(room_id_param UUID)
RETURNS void AS $$
DECLARE
    player_record RECORD;
    room_expansion BOOLEAN;
    player_count INTEGER;
    pig_count INTEGER;
BEGIN
    -- 방의 확장판 여부와 플레이어 수 확인
    SELECT is_expansion INTO room_expansion FROM rooms WHERE id = room_id_param;
    SELECT COUNT(*) INTO player_count FROM room_players WHERE room_id = room_id_param;
    
    IF player_count < 2 THEN
        RAISE EXCEPTION '게임을 시작하려면 최소 2명의 플레이어가 필요합니다.';
    END IF;
    
    -- 플레이어 수에 따른 돼지 수 결정 (드렉사우 공식 규칙)
    CASE player_count
        WHEN 2 THEN pig_count := 5;
        WHEN 3 THEN pig_count := 4;
        ELSE pig_count := 3;  -- 4명 이상은 3마리
    END CASE;
    
    -- 게임 덱 초기화
    PERFORM initialize_game_deck(room_id_param, room_expansion);
    
    -- 각 플레이어의 돼지와 손패 초기화 (올바른 돼지 수 적용)
    FOR player_record IN 
        SELECT player_id FROM room_players WHERE room_id = room_id_param ORDER BY player_order
    LOOP
        PERFORM initialize_player_pigs(room_id_param, player_record.player_id, pig_count);
        PERFORM initialize_player_hand(room_id_param, player_record.player_id);
    END LOOP;
    
    -- 게임 상태 생성/업데이트
    INSERT INTO game_states (room_id, current_player_order, game_phase, started_at)
    VALUES (room_id_param, 1, 'playing', NOW())
    ON CONFLICT (room_id)
    DO UPDATE SET 
        current_player_order = 1,
        game_phase = 'playing',
        started_at = NOW(),
        finished_at = NULL,
        winner_player_id = NULL;
    
    -- 방 상태를 'playing'으로 변경
    UPDATE rooms SET status = 'playing' WHERE id = room_id_param;
    
    -- 게임 시작 로그 (돼지 수 정보 포함)
    INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
    VALUES (room_id_param, NULL, 'game_start', 
            jsonb_build_object(
                'message', '게임이 시작되었습니다',
                'player_count', player_count,
                'pig_count', pig_count
            ), 0);
END;
$$ LANGUAGE plpgsql;

-- Test the updated function
DO $$
DECLARE
    test_room_id UUID;
BEGIN
    -- Find the most recent room for testing
    SELECT id INTO test_room_id 
    FROM rooms 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_room_id IS NOT NULL THEN
        RAISE NOTICE '테스트용 방 ID: %', test_room_id;
        
        -- Check player count for this room
        RAISE NOTICE '플레이어 수: %', (
            SELECT COUNT(*) FROM room_players WHERE room_id = test_room_id
        );
        
        -- Expected pig count based on player count
        RAISE NOTICE '예상 돼지 수: %', (
            CASE (SELECT COUNT(*) FROM room_players WHERE room_id = test_room_id)
                WHEN 2 THEN 5
                WHEN 3 THEN 4
                ELSE 3
            END
        );
    END IF;
END
$$;