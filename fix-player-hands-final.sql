-- Fix player_hands RLS to allow game initialization
-- Run this in your Supabase SQL Editor

-- 1. Check current policies on player_hands
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'player_hands'
ORDER BY policyname;

-- 2. Drop all existing player_hands policies
DROP POLICY IF EXISTS "Players can view own cards" ON player_hands;
DROP POLICY IF EXISTS "System can deal cards" ON player_hands;
DROP POLICY IF EXISTS "Players can discard cards" ON player_hands;
DROP POLICY IF EXISTS "Players can update own cards" ON player_hands;

-- 3. Create new policies that allow game initialization
-- SELECT: Players can only see their own cards
CREATE POLICY "players_can_view_own_cards" 
ON player_hands FOR SELECT 
USING (player_id = auth.uid());

-- INSERT: Room creator (game host) can deal cards to anyone in the room
-- This allows game initialization where host creates cards for all players
CREATE POLICY "room_creator_can_deal_cards" 
ON player_hands FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = room_id 
    AND r.creator_id = auth.uid()
  )
);

-- UPDATE: Players can update their own cards (for card count changes)
CREATE POLICY "players_can_update_own_cards" 
ON player_hands FOR UPDATE 
USING (player_id = auth.uid());

-- DELETE: Players can discard their own cards
CREATE POLICY "players_can_discard_own_cards" 
ON player_hands FOR DELETE 
USING (player_id = auth.uid());

-- Alternative: If the above doesn't work, create a more permissive policy
-- DROP POLICY IF EXISTS "room_creator_can_deal_cards" ON player_hands;
-- 
-- CREATE POLICY "room_participants_can_manage_cards" 
-- ON player_hands FOR INSERT 
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM room_players rp
--     WHERE rp.room_id = room_id 
--     AND rp.player_id = auth.uid()
--   )
-- );

-- 4. Grant permissions
GRANT ALL ON player_hands TO authenticated;

-- 5. Test query to see if policies work
-- This should return cards for the current user only
SELECT 
  room_id,
  player_id,
  card_type,
  card_count
FROM player_hands 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
ORDER BY player_id, card_type;

-- 6. Verify new policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'player_hands'
ORDER BY policyname;