-- 드렉사우 게임 데이터베이스 - 게임 초기화 함수들
-- 게임 로직을 위한 저장 프로시저들

-- 게임 덱 초기화 함수
CREATE OR REPLACE FUNCTION initialize_game_deck(room_id_param UUID, is_expansion_param BOOLEAN DEFAULT false)
RETURNS void AS $$
BEGIN
    -- 기본 카드들 삭제 (재시작시)
    DELETE FROM game_deck WHERE room_id = room_id_param;
    DELETE FROM discarded_cards WHERE room_id = room_id_param;
    
    -- 기본 카드들 추가
    INSERT INTO game_deck (room_id, card_type, remaining_count) VALUES
    (room_id_param, 'mud', 21),
    (room_id_param, 'rain', 4),
    (room_id_param, 'lightning', 4),
    (room_id_param, 'lightning_rod', 4),
    (room_id_param, 'barn', 9),
    (room_id_param, 'barn_lock', 4),
    (room_id_param, 'bath', 8);
    
    -- 확장판 카드들 추가
    IF is_expansion_param THEN
        INSERT INTO game_deck (room_id, card_type, remaining_count) VALUES
        (room_id_param, 'beautiful_pig', 16),
        (room_id_param, 'escape', 12),
        (room_id_param, 'lucky_bird', 4);
    END IF;
    
    -- 버린카드 테이블 초기화
    INSERT INTO discarded_cards (room_id, card_type, discarded_count)
    SELECT room_id_param, card_type, 0 
    FROM game_deck WHERE room_id = room_id_param;
    
    -- 덱 총 카드 수 업데이트
    UPDATE game_states 
    SET deck_remaining = (
        SELECT SUM(remaining_count) 
        FROM game_deck 
        WHERE room_id = room_id_param
    )
    WHERE room_id = room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 플레이어 돼지 초기화 함수
CREATE OR REPLACE FUNCTION initialize_player_pigs(room_id_param UUID, player_id_param UUID, pig_count INTEGER DEFAULT 3)
RETURNS void AS $$
BEGIN
    -- 기존 돼지 삭제 (재시작시)
    DELETE FROM player_pigs WHERE room_id = room_id_param AND player_id = player_id_param;
    
    -- 새 돼지들 생성
    FOR i IN 1..pig_count LOOP
        INSERT INTO player_pigs (room_id, player_id, pig_index, pig_state)
        VALUES (room_id_param, player_id_param, i, 'clean');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 플레이어 손패 초기화 함수  
CREATE OR REPLACE FUNCTION initialize_player_hand(room_id_param UUID, player_id_param UUID)
RETURNS void AS $$
DECLARE
    deck_cards RECORD;
    cards_to_draw INTEGER := 3;
    total_remaining INTEGER;
BEGIN
    -- 기존 손패 삭제
    DELETE FROM player_hands WHERE room_id = room_id_param AND player_id = player_id_param;
    
    -- 덱에 카드가 충분한지 확인
    SELECT SUM(remaining_count) INTO total_remaining
    FROM game_deck WHERE room_id = room_id_param;
    
    IF total_remaining < cards_to_draw THEN
        RAISE EXCEPTION '덱에 카드가 부족합니다. 남은 카드: %', total_remaining;
    END IF;
    
    -- 3장을 뽑을 때까지 반복
    FOR i IN 1..cards_to_draw LOOP
        -- 덱에서 가중치가 적용된 랜덤 카드 선택
        SELECT card_type INTO deck_cards
        FROM game_deck 
        WHERE room_id = room_id_param AND remaining_count > 0
        ORDER BY random() * remaining_count DESC
        LIMIT 1;
        
        IF deck_cards.card_type IS NOT NULL THEN
            -- 덱에서 카드 제거
            UPDATE game_deck 
            SET remaining_count = remaining_count - 1
            WHERE room_id = room_id_param AND card_type = deck_cards.card_type;
            
            -- 플레이어 손패에 카드 추가
            INSERT INTO player_hands (room_id, player_id, card_type, card_count)
            VALUES (room_id_param, player_id_param, deck_cards.card_type, 1)
            ON CONFLICT (room_id, player_id, card_type)
            DO UPDATE SET card_count = player_hands.card_count + 1;
        END IF;
    END LOOP;
    
    -- 덱 남은 카드 수 업데이트
    UPDATE game_states 
    SET deck_remaining = (
        SELECT SUM(remaining_count) 
        FROM game_deck 
        WHERE room_id = room_id_param
    )
    WHERE room_id = room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 카드 뽑기 함수
CREATE OR REPLACE FUNCTION draw_card(room_id_param UUID, player_id_param UUID)
RETURNS card_type AS $$
DECLARE
    drawn_card card_type;
    total_remaining INTEGER;
BEGIN
    -- 덱 확인
    SELECT SUM(remaining_count) INTO total_remaining
    FROM game_deck WHERE room_id = room_id_param;
    
    IF total_remaining <= 0 THEN
        -- 버린 카드더미를 덱으로 복구
        PERFORM reshuffle_deck(room_id_param);
    END IF;
    
    -- 랜덤 카드 뽑기
    SELECT card_type INTO drawn_card
    FROM game_deck 
    WHERE room_id = room_id_param AND remaining_count > 0
    ORDER BY random() * remaining_count DESC
    LIMIT 1;
    
    IF drawn_card IS NOT NULL THEN
        -- 덱에서 카드 제거
        UPDATE game_deck 
        SET remaining_count = remaining_count - 1
        WHERE room_id = room_id_param AND card_type = drawn_card;
        
        -- 플레이어 손패에 추가
        INSERT INTO player_hands (room_id, player_id, card_type, card_count)
        VALUES (room_id_param, player_id_param, drawn_card, 1)
        ON CONFLICT (room_id, player_id, card_type)
        DO UPDATE SET card_count = player_hands.card_count + 1;
        
        -- 덱 남은 카드 수 업데이트
        UPDATE game_states 
        SET deck_remaining = (
            SELECT SUM(remaining_count) 
            FROM game_deck 
            WHERE room_id = room_id_param
        )
        WHERE room_id = room_id_param;
    END IF;
    
    RETURN drawn_card;
END;
$$ LANGUAGE plpgsql;

-- 덱 재섞기 함수
CREATE OR REPLACE FUNCTION reshuffle_deck(room_id_param UUID)
RETURNS void AS $$
BEGIN
    -- 버린 카드를 덱으로 이동
    UPDATE game_deck 
    SET remaining_count = remaining_count + dc.discarded_count
    FROM discarded_cards dc
    WHERE game_deck.room_id = room_id_param 
    AND dc.room_id = room_id_param 
    AND game_deck.card_type = dc.card_type;
    
    -- 버린 카드더미 초기화
    UPDATE discarded_cards 
    SET discarded_count = 0
    WHERE room_id = room_id_param;
    
    -- 게임 로그 추가
    INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
    VALUES (room_id_param, NULL, 'deck_reshuffle', '{"message": "덱을 다시 섞었습니다"}', 0);
END;
$$ LANGUAGE plpgsql;

-- 게임 시작 함수
CREATE OR REPLACE FUNCTION start_game(room_id_param UUID)
RETURNS void AS $$
DECLARE
    player_record RECORD;
    room_expansion BOOLEAN;
    player_count INTEGER;
BEGIN
    -- 방의 확장판 여부와 플레이어 수 확인
    SELECT is_expansion INTO room_expansion FROM rooms WHERE id = room_id_param;
    SELECT COUNT(*) INTO player_count FROM room_players WHERE room_id = room_id_param;
    
    IF player_count < 2 THEN
        RAISE EXCEPTION '게임을 시작하려면 최소 2명의 플레이어가 필요합니다.';
    END IF;
    
    -- 게임 덱 초기화
    PERFORM initialize_game_deck(room_id_param, room_expansion);
    
    -- 각 플레이어의 돼지와 손패 초기화
    FOR player_record IN 
        SELECT player_id FROM room_players WHERE room_id = room_id_param ORDER BY player_order
    LOOP
        PERFORM initialize_player_pigs(room_id_param, player_record.player_id);
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
    
    -- 게임 시작 로그
    INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
    VALUES (room_id_param, NULL, 'game_start', '{"message": "게임이 시작되었습니다"}', 0);
END;
$$ LANGUAGE plpgsql;

-- 게임 종료 확인 함수
CREATE OR REPLACE FUNCTION check_game_winner(room_id_param UUID, player_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    dirty_pigs INTEGER;
    beautiful_pigs INTEGER;
    total_pigs INTEGER;
BEGIN
    -- 플레이어의 돼지 상태 확인
    SELECT 
        COUNT(CASE WHEN pig_state = 'dirty' THEN 1 END),
        COUNT(CASE WHEN pig_state = 'beautiful' THEN 1 END),
        COUNT(*)
    INTO dirty_pigs, beautiful_pigs, total_pigs
    FROM player_pigs 
    WHERE room_id = room_id_param AND player_id = player_id_param;
    
    -- 승리 조건 확인
    IF dirty_pigs = total_pigs OR beautiful_pigs = total_pigs THEN
        -- 게임 종료 처리
        UPDATE game_states 
        SET 
            game_phase = 'finished',
            winner_player_id = player_id_param,
            finished_at = NOW()
        WHERE room_id = room_id_param;
        
        -- 방 상태 변경
        UPDATE rooms SET status = 'finished' WHERE id = room_id_param;
        
        -- 승리 로그
        INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
        VALUES (room_id_param, player_id_param, 'game_end', 
                jsonb_build_object('winner', player_id_param, 'victory_type', 
                    CASE WHEN dirty_pigs = total_pigs THEN 'dirty_pigs' ELSE 'beautiful_pigs' END), 
                (SELECT COALESCE(MAX(turn_number), 0) + 1 FROM game_logs WHERE room_id = room_id_param));
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;