-- Fix player order constraint issue
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what data exists in room_players
SELECT room_id, player_id, player_order 
FROM room_players 
ORDER BY room_id, player_order;

-- 2. Create a function to safely get next player order
CREATE OR REPLACE FUNCTION get_next_player_order(room_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    next_order INTEGER;
BEGIN
    -- Get the next available player order for this room
    SELECT COALESCE(MAX(player_order), 0) + 1 
    INTO next_order
    FROM room_players 
    WHERE room_id = room_id_param;
    
    RETURN next_order;
END;
$$ LANGUAGE plpgsql;

-- 3. Alternative: Remove the unique constraint on room_id + player_order
-- and just use auto-incrementing player_order per room
ALTER TABLE room_players DROP CONSTRAINT IF EXISTS room_players_room_id_player_order_key;

-- 4. Create a better constraint that ensures unique player per room
-- (which is what we really want)
ALTER TABLE room_players 
DROP CONSTRAINT IF EXISTS room_players_room_id_player_id_key;

ALTER TABLE room_players 
ADD CONSTRAINT room_players_room_id_player_id_key 
UNIQUE (room_id, player_id);

-- 5. Test the function
SELECT get_next_player_order('00000000-0000-0000-0000-000000000000');