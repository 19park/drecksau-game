-- Clean all player_hands policies and create new ones
-- Run this in your Supabase SQL Editor

-- 1. Drop ALL existing policies on player_hands
DROP POLICY IF EXISTS "Players can insert own hand" ON player_hands;
DROP POLICY IF EXISTS "Players can update own hand" ON player_hands;
DROP POLICY IF EXISTS "Players can view own hand" ON player_hands;
DROP POLICY IF EXISTS "allow_all_authenticated_users_player_hands" ON player_hands;

-- Drop any other possible policy names
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON player_hands;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON player_hands;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON player_hands;

-- 2. Create ONE simple policy that allows everything for authenticated users
CREATE POLICY "authenticated_users_full_access_player_hands" 
ON player_hands FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Verify only our new policy exists
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

-- 4. Test manual insert to verify it works
INSERT INTO player_hands (room_id, player_id, card_type, card_count)
VALUES (
  '42b047cf-8795-4542-bb1d-c3dca38190f6',
  auth.uid(),
  'mud',
  1
)
ON CONFLICT (room_id, player_id, card_type) 
DO UPDATE SET card_count = player_hands.card_count + 1;

-- 5. Check if the insert worked
SELECT 
  room_id,
  player_id,
  card_type,
  card_count,
  created_at
FROM player_hands 
WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
AND player_id = auth.uid()
ORDER BY card_type;