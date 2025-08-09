-- Fix room-related issues
-- Run this in your Supabase SQL Editor

-- 1. Create function to update current_players count
CREATE OR REPLACE FUNCTION update_room_current_players()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Player joined
    UPDATE rooms 
    SET current_players = (
      SELECT COUNT(*) FROM room_players 
      WHERE room_id = NEW.room_id
    )
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Player left
    UPDATE rooms 
    SET current_players = (
      SELECT COUNT(*) FROM room_players 
      WHERE room_id = OLD.room_id
    )
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Create triggers to automatically update current_players
DROP TRIGGER IF EXISTS update_room_players_count_insert ON room_players;
DROP TRIGGER IF EXISTS update_room_players_count_delete ON room_players;

CREATE TRIGGER update_room_players_count_insert
  AFTER INSERT ON room_players
  FOR EACH ROW
  EXECUTE FUNCTION update_room_current_players();

CREATE TRIGGER update_room_players_count_delete
  AFTER DELETE ON room_players
  FOR EACH ROW
  EXECUTE FUNCTION update_room_current_players();

-- 3. Fix current current_players counts for existing rooms
UPDATE rooms 
SET current_players = (
  SELECT COUNT(*) 
  FROM room_players 
  WHERE room_players.room_id = rooms.id
);

-- 4. Enable realtime for rooms table (if not already enabled)
-- This ensures room list updates are broadcasted to all clients
-- Check if tables are already in publication
DO $$
BEGIN
    -- Add rooms table if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
    END IF;
    
    -- Add room_players table if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_players'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
    END IF;
END
$$;