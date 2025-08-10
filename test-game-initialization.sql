-- Test and debug game initialization
-- Run this in your Supabase SQL Editor

-- 1. Check if the functions exist
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('initialize_game', 'start_game')
ORDER BY proname;

-- 2. Test the initialize_game function manually
SELECT initialize_game('42b047cf-8795-4542-bb1d-c3dca38190f6');  -- Replace with actual room ID

-- 3. Check what was created after the function call
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

-- 4. Check the actual game_states data if it exists
SELECT * FROM game_states WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6';

-- 5. Check room status
SELECT id, name, status, is_expansion 
FROM rooms 
WHERE id = '42b047cf-8795-4542-bb1d-c3dca38190f6';

-- 6. Check room players
SELECT rp.player_id, p.email, rp.player_order 
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
WHERE rp.room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
ORDER BY rp.player_order;