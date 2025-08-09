-- Simple fix for room_players RLS infinite recursion
-- Run this in your Supabase SQL Editor

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Room players can view room_players" ON room_players;

-- Create a simple policy that avoids recursion
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
);