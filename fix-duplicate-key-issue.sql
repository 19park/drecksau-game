-- Fix duplicate key issue in game initialization
-- Run this in your Supabase SQL Editor

-- 1. First, completely clean the specific room's game data
DELETE FROM player_hands 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

DELETE FROM player_pigs 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

DELETE FROM game_deck 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

DELETE FROM discarded_cards 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

DELETE FROM game_logs 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

DELETE FROM game_states 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

-- 2. Reset room status
UPDATE rooms 
SET status = 'waiting' 
WHERE id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

-- 3. Improve the initialize_player_pigs function to handle duplicates better
CREATE OR REPLACE FUNCTION initialize_player_pigs(room_id_param UUID, player_id_param UUID, pig_count INTEGER DEFAULT 3)
RETURNS void AS $$
BEGIN
    -- First, completely delete existing pigs for this player in this room
    DELETE FROM player_pigs 
    WHERE room_id = room_id_param AND player_id = player_id_param;
    
    -- Wait a moment to ensure delete is committed
    PERFORM pg_sleep(0.1);
    
    -- Now create new pigs
    FOR i IN 1..pig_count LOOP
        INSERT INTO player_pigs (room_id, player_id, pig_index, pig_state)
        VALUES (room_id_param, player_id_param, i, 'clean')
        ON CONFLICT (room_id, player_id, pig_index) 
        DO UPDATE SET 
            pig_state = 'clean',
            has_barn = false,
            barn_locked = false,
            has_lightning_rod = false,
            updated_at = NOW();
    END LOOP;
    
    -- Log the initialization
    RAISE NOTICE 'Initialized % pigs for player % in room %', pig_count, player_id_param, room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 4. Improve the initialize_player_hand function to handle duplicates better
CREATE OR REPLACE FUNCTION initialize_player_hand(room_id_param UUID, player_id_param UUID)
RETURNS void AS $$
DECLARE
    deck_cards RECORD;
    cards_to_draw INTEGER := 3;
    total_remaining INTEGER;
BEGIN
    -- First, completely delete existing hand for this player in this room
    DELETE FROM player_hands 
    WHERE room_id = room_id_param AND player_id = player_id_param;
    
    -- Wait a moment to ensure delete is committed
    PERFORM pg_sleep(0.1);
    
    -- Check if deck has enough cards
    SELECT SUM(remaining_count) INTO total_remaining
    FROM game_deck WHERE room_id = room_id_param;
    
    IF total_remaining < cards_to_draw THEN
        RAISE EXCEPTION 'Not enough cards in deck. Remaining: %', total_remaining;
    END IF;
    
    -- Draw 3 cards
    FOR i IN 1..cards_to_draw LOOP
        -- Select random card from deck
        SELECT card_type INTO deck_cards
        FROM game_deck 
        WHERE room_id = room_id_param AND remaining_count > 0
        ORDER BY random() * remaining_count DESC
        LIMIT 1;
        
        IF deck_cards.card_type IS NOT NULL THEN
            -- Remove card from deck
            UPDATE game_deck 
            SET remaining_count = remaining_count - 1
            WHERE room_id = room_id_param AND card_type = deck_cards.card_type;
            
            -- Add card to player hand
            INSERT INTO player_hands (room_id, player_id, card_type, card_count)
            VALUES (room_id_param, player_id_param, deck_cards.card_type, 1)
            ON CONFLICT (room_id, player_id, card_type)
            DO UPDATE SET card_count = player_hands.card_count + 1;
        END IF;
    END LOOP;
    
    -- Update deck remaining count
    UPDATE game_states 
    SET deck_remaining = (
        SELECT SUM(remaining_count) 
        FROM game_deck 
        WHERE room_id = room_id_param
    )
    WHERE room_id = room_id_param;
    
    -- Log the initialization
    RAISE NOTICE 'Initialized hand with % cards for player % in room %', cards_to_draw, player_id_param, room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 5. Improve the main start_game function to be more robust
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
    DELETE FROM game_states WHERE room_id = room_id_param;
    
    -- Initialize game deck
    PERFORM initialize_game_deck(room_id_param, room_expansion);
    
    -- Initialize each player's pigs and hand
    FOR player_record IN 
        SELECT player_id FROM room_players WHERE room_id = room_id_param ORDER BY player_order
    LOOP
        PERFORM initialize_player_pigs(room_id_param, player_record.player_id);
        PERFORM initialize_player_hand(room_id_param, player_record.player_id);
    END LOOP;
    
    -- Create game state
    INSERT INTO game_states (room_id, current_player_order, game_phase, started_at)
    VALUES (room_id_param, 1, 'playing', NOW());
    
    -- Update room status
    UPDATE rooms SET status = 'playing' WHERE id = room_id_param;
    
    -- Add start game log
    INSERT INTO game_logs (room_id, player_id, action_type, action_details, turn_number)
    VALUES (room_id_param, NULL, 'game_start', '{"message": "Game started"}', 0);
    
    RAISE NOTICE 'Game started successfully for room %', room_id_param;
END;
$$ LANGUAGE plpgsql;

-- 6. Verify the current state after cleanup
SELECT 'player_pigs' as table_name, count(*) as count FROM player_pigs WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
UNION ALL
SELECT 'player_hands', count(*) FROM player_hands WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
UNION ALL
SELECT 'game_deck', count(*) FROM game_deck WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
UNION ALL
SELECT 'game_states', count(*) FROM game_states WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';