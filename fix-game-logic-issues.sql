-- Fix game logic issues
-- Run this in your Supabase SQL Editor

-- 1. First, let's check what's wrong with the current game state
SELECT 
  r.id as room_id,
  r.name as room_name,
  r.status as room_status,
  gs.current_player_order,
  gs.game_phase,
  gs.winner_player_id
FROM rooms r
LEFT JOIN game_states gs ON r.id = gs.room_id
WHERE r.id = '42b047cf-8795-4542-bb1d-c3dca38190f6'  -- Replace with actual room ID
ORDER BY r.created_at DESC;

-- 2. Check player pigs state  
SELECT 
  pp.room_id,
  pp.player_id,
  p.email,
  pp.pig_index,
  pp.pig_state,
  pp.has_barn,
  pp.barn_locked
FROM player_pigs pp
LEFT JOIN profiles p ON pp.player_id = p.id
WHERE pp.room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'  -- Replace with actual room ID
ORDER BY pp.player_id, pp.pig_index;

-- 3. Check room players and their order
SELECT 
  rp.room_id,
  rp.player_id,
  p.email,
  rp.player_order,
  rp.is_ready
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
WHERE rp.room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'  -- Replace with actual room ID
ORDER BY rp.player_order;

-- 4. Fix: Reset game state to a proper state
-- First, reset room status back to waiting
UPDATE rooms 
SET status = 'waiting' 
WHERE id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

-- 5. Delete game state to allow fresh restart
DELETE FROM game_states 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID

-- 6. Clean up all game data for fresh start
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

-- 7. Create the main game initialization function that we're missing
CREATE OR REPLACE FUNCTION initialize_game(room_id_param UUID)
RETURNS void AS $$
BEGIN
    -- Call the start_game function which handles everything
    PERFORM start_game(room_id_param);
END;
$$ LANGUAGE plpgsql;

-- 8. Create a function to validate if it's player's turn
CREATE OR REPLACE FUNCTION is_player_turn(room_id_param UUID, player_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_turn_order INTEGER;
    player_order INTEGER;
    game_status TEXT;
BEGIN
    -- Get current game state
    SELECT gs.current_player_order, gs.game_phase
    INTO current_turn_order, game_status
    FROM game_states gs
    WHERE gs.room_id = room_id_param;
    
    -- If no game state or not in playing phase, return false
    IF current_turn_order IS NULL OR game_status != 'playing' THEN
        RETURN FALSE;
    END IF;
    
    -- Get player's order
    SELECT rp.player_order
    INTO player_order
    FROM room_players rp
    WHERE rp.room_id = room_id_param AND rp.player_id = player_id_param;
    
    -- Check if it's player's turn
    RETURN (player_order = current_turn_order);
END;
$$ LANGUAGE plpgsql;

-- 9. Verify the functions are created
SELECT proname FROM pg_proc WHERE proname IN ('initialize_game', 'is_player_turn');