-- Fix game_states duplicate key issue
-- Run this in your Supabase SQL Editor

-- 1. First, completely remove any existing game state for this room
DELETE FROM game_states 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

-- 2. Fix the start_game function to use UPSERT instead of INSERT
CREATE OR REPLACE FUNCTION start_game(room_id_param UUID)
RETURNS void AS $$
DECLARE
    player_record RECORD;
    room_expansion BOOLEAN;
    player_count INTEGER;
BEGIN
    -- Get room info
    SELECT is_expansion INTO room_expansion FROM rooms WHERE id = room_id_param;
    SELECT COUNT(*) INTO player_count FROM room_players WHERE room_id = room_id_param;
    
    IF player_count < 2 THEN
        RAISE EXCEPTION 'At least 2 players required to start game.';
    END IF;
    
    -- Clean up any existing game data first
    DELETE FROM player_hands WHERE room_id = room_id_param;
    DELETE FROM player_pigs WHERE room_id = room_id_param;
    DELETE FROM game_deck WHERE room_id = room_id_param;
    DELETE FROM discarded_cards WHERE room_id = room_id_param;
    DELETE FROM game_logs WHERE room_id = room_id_param;
    
    -- Use UPSERT for game_states to avoid duplicate key error
    INSERT INTO game_states (room_id, current_player_order, game_phase, started_at, deck_remaining)
    VALUES (room_id_param, 1, 'playing', NOW(), 0)
    ON CONFLICT (room_id)
    DO UPDATE SET 
        current_player_order = 1,
        game_phase = 'playing',
        started_at = NOW(),
        finished_at = NULL,
        winner_player_id = NULL,
        deck_remaining = 0,
        updated_at = NOW();
    
    -- Initialize game deck
    PERFORM initialize_game_deck(room_id_param, room_expansion);
    
    -- Initialize each player's pigs and hand
    FOR player_record IN 
        SELECT player_id FROM room_players WHERE room_id = room_id_param ORDER BY player_order
    LOOP
        PERFORM initialize_player_pigs(room_id_param, player_record.player_id);
        PERFORM initialize_player_hand(room_id_param, player_record.player_id);
    END LOOP;
    
    -- Update room status
    UPDATE rooms SET status = 'playing' WHERE id = room_id_param;
    
    -- Add start game log
    INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
    VALUES (room_id_param, NULL, 'game_start', '{"message": "Game started"}', 0);
    
    RAISE NOTICE 'Game started successfully for room %', room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 3. Also fix the initialize_game function to use the improved start_game
CREATE OR REPLACE FUNCTION initialize_game(room_id_param UUID)
RETURNS void AS $$
BEGIN
    -- Use the improved start_game function
    PERFORM start_game(room_id_param);
    
    RAISE NOTICE 'Game initialized successfully for room %', room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 4. Fix initialize_game_deck to also use UPSERT pattern
CREATE OR REPLACE FUNCTION initialize_game_deck(room_id_param UUID, is_expansion_param BOOLEAN DEFAULT false)
RETURNS void AS $$
BEGIN
    -- Clean up existing deck data first
    DELETE FROM game_deck WHERE room_id = room_id_param;
    DELETE FROM discarded_cards WHERE room_id = room_id_param;
    
    -- Add basic cards
    INSERT INTO game_deck (room_id, card_type, remaining_count) VALUES
    (room_id_param, 'mud', 21),
    (room_id_param, 'rain', 4),
    (room_id_param, 'lightning', 4),
    (room_id_param, 'lightning_rod', 4),
    (room_id_param, 'barn', 9),
    (room_id_param, 'barn_lock', 4),
    (room_id_param, 'bath', 8);
    
    -- Add expansion cards if needed
    IF is_expansion_param THEN
        INSERT INTO game_deck (room_id, card_type, remaining_count) VALUES
        (room_id_param, 'beautiful_pig', 16),
        (room_id_param, 'escape', 12),
        (room_id_param, 'lucky_bird', 4);
    END IF;
    
    -- Initialize discard pile
    INSERT INTO discarded_cards (room_id, card_type, discarded_count)
    SELECT room_id_param, card_type, 0 
    FROM game_deck WHERE room_id = room_id_param;
    
    -- Update deck count in game state
    UPDATE game_states 
    SET deck_remaining = (
        SELECT SUM(remaining_count) 
        FROM game_deck 
        WHERE room_id = room_id_param
    )
    WHERE room_id = room_id_param;
    
    RAISE NOTICE 'Game deck initialized for room %', room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 5. Verify cleanup
SELECT 'game_states' as table_name, count(*) as count 
FROM game_states WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
UNION ALL
SELECT 'player_pigs', count(*) 
FROM player_pigs WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
UNION ALL
SELECT 'player_hands', count(*) 
FROM player_hands WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
UNION ALL
SELECT 'game_deck', count(*) 
FROM game_deck WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';