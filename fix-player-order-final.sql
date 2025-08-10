-- Fix player order duplication issue - Final version
-- Run this in your Supabase SQL Editor

-- 1. Check current room_players with duplicate player_order
SELECT 
  room_id,
  player_id,
  player_order,
  p.email,
  rp.joined_at
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'  -- Replace with actual room ID
ORDER BY rp.joined_at;

-- 2. Fix the duplicate player_order issue manually
-- First player (oldest) gets order 1
UPDATE room_players 
SET player_order = 1
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
  AND id = (
    SELECT id FROM room_players 
    WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
    ORDER BY joined_at 
    LIMIT 1
  );

-- Second player gets order 2
UPDATE room_players 
SET player_order = 2
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
  AND id = (
    SELECT id FROM room_players 
    WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
    ORDER BY joined_at 
    LIMIT 1 OFFSET 1
  );

-- Third player gets order 3 (if exists)
UPDATE room_players 
SET player_order = 3
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
  AND id = (
    SELECT id FROM room_players 
    WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
    ORDER BY joined_at 
    LIMIT 1 OFFSET 2
  );

-- Fourth player gets order 4 (if exists)
UPDATE room_players 
SET player_order = 4
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
  AND id = (
    SELECT id FROM room_players 
    WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
    ORDER BY joined_at 
    LIMIT 1 OFFSET 3
  );

-- 3. Improve the get_next_player_order function to be more robust
CREATE OR REPLACE FUNCTION get_next_player_order(room_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    next_order INTEGER;
    max_order INTEGER;
BEGIN
    -- Get the current maximum player_order for this room
    SELECT COALESCE(MAX(player_order), 0) 
    INTO max_order
    FROM room_players 
    WHERE room_id = room_id_param;
    
    -- Return the next order
    next_order := max_order + 1;
    
    -- Log for debugging
    RAISE NOTICE 'Room: %, Max order: %, Next order: %', room_id_param, max_order, next_order;
    
    RETURN next_order;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a safer constraint that auto-assigns player_order
CREATE OR REPLACE FUNCTION auto_assign_player_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Only assign if player_order is not set or is 0
    IF NEW.player_order IS NULL OR NEW.player_order <= 0 THEN
        SELECT COALESCE(MAX(player_order), 0) + 1 
        INTO NEW.player_order
        FROM room_players 
        WHERE room_id = NEW.room_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assigning player_order
DROP TRIGGER IF EXISTS auto_assign_player_order_trigger ON room_players;
CREATE TRIGGER auto_assign_player_order_trigger
    BEFORE INSERT ON room_players
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_player_order();

-- 5. Verify the fix
SELECT 
  room_id,
  player_id,
  player_order,
  p.email,
  rp.joined_at
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'  -- Replace with actual room ID
ORDER BY player_order;