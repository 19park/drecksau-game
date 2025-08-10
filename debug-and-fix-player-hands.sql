-- Debug and fix player_hands RLS - Simple approach
-- Run this in your Supabase SQL Editor

-- 1. Check what policies actually exist on player_hands
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'player_hands'
ORDER BY policyname;

-- 2. Check if RLS is even enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'player_hands';

-- 3. Temporarily disable RLS to test if that's the issue
-- ALTER TABLE player_hands DISABLE ROW LEVEL SECURITY;

-- 4. Or create a very permissive policy for testing
DROP POLICY IF EXISTS "players_can_view_own_cards" ON player_hands;
DROP POLICY IF EXISTS "room_creator_can_deal_cards" ON player_hands;
DROP POLICY IF EXISTS "players_can_update_own_cards" ON player_hands;
DROP POLICY IF EXISTS "players_can_discard_own_cards" ON player_hands;

-- Create simple permissive policies for testing
CREATE POLICY "allow_all_authenticated_users_player_hands" 
ON player_hands FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Test if we can now insert into player_hands manually
-- INSERT INTO player_hands (room_id, player_id, card_type, card_count)
-- VALUES (
--   '42b047cf-8795-4542-bb1d-c3dca38190f6',
--   auth.uid(),
--   'mud',
--   3
-- );

-- 6. Verify the policy is working
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'player_hands'
ORDER BY policyname;

-- 7. Check if there are any existing player_hands records
SELECT 
  room_id,
  player_id,
  card_type,
  card_count,
  created_at
FROM player_hands 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
ORDER BY player_id, card_type;