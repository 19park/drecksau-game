-- Fix infinite recursion in room_players RLS policy
-- Run this in your Supabase SQL Editor

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Room players can view room_players" ON room_players;

-- Check if rooms table has is_private column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' 
    AND column_name = 'is_private' 
    AND table_schema = 'public'
  ) THEN
    -- Create policy with is_private check
    EXECUTE '
    CREATE POLICY "Room players can view room_players" ON room_players
    FOR SELECT USING (
      -- User can see their own entries
      player_id = auth.uid()
      OR
      -- User can see entries for rooms they created
      EXISTS (
        SELECT 1 FROM rooms 
        WHERE rooms.id = room_players.room_id 
        AND rooms.creator_id = auth.uid()
      )
      OR
      -- For public rooms, anyone can see the players
      EXISTS (
        SELECT 1 FROM rooms 
        WHERE rooms.id = room_players.room_id 
        AND rooms.is_private = false
      )
    );';
  ELSE
    -- Create simpler policy without is_private check
    EXECUTE '
    CREATE POLICY "Room players can view room_players" ON room_players
    FOR SELECT USING (
      -- User can see their own entries
      player_id = auth.uid()
      OR
      -- User can see entries for rooms they created
      EXISTS (
        SELECT 1 FROM rooms 
        WHERE rooms.id = room_players.room_id 
        AND rooms.creator_id = auth.uid()
      )
    );';
  END IF;
END $$;