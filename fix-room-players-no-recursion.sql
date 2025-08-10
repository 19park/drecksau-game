-- Fix room_players RLS without recursion
-- Run this in your Supabase SQL Editor

-- 1. Drop the problematic recursive policy
DROP POLICY IF EXISTS "room_participants_can_see_all_players" ON room_players;

-- 2. Create a simple, non-recursive SELECT policy
-- Option 1: Allow all authenticated users to see room_players (simplest)
CREATE POLICY "authenticated_users_can_see_room_players" 
ON room_players FOR SELECT 
USING (auth.role() = 'authenticated');

-- Alternative Option 2: Use rooms table to check participation (no recursion)
-- DROP POLICY IF EXISTS "authenticated_users_can_see_room_players" ON room_players;
-- CREATE POLICY "room_participants_see_players_via_rooms" 
-- ON room_players FOR SELECT 
-- USING (
--   EXISTS (
--     SELECT 1 FROM rooms r
--     WHERE r.id = room_players.room_id 
--     AND (r.creator_id = auth.uid() OR true)  -- Allow all for now, can be refined
--   )
-- );

-- 3. Keep other policies as they are (no recursion issues)
-- INSERT: Users can join rooms
-- UPDATE: Users can update their ready status  
-- DELETE: Users can leave rooms

-- 4. Test the policy
SELECT 
  rp.room_id,
  rp.player_id,
  rp.player_order,
  p.email,
  rp.is_ready
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
WHERE rp.room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
ORDER BY rp.player_order;

-- 5. Verify policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'room_players'
ORDER BY policyname;