-- Clean and fix room_players RLS policies
-- Run this in your Supabase SQL Editor

-- 1. First, check all current RLS policies on room_players
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'room_players'
ORDER BY policyname;

-- 2. Drop ALL existing policies on room_players to start fresh
DROP POLICY IF EXISTS "Users can view own room participation" ON room_players;
DROP POLICY IF EXISTS "Users can only see their own room players" ON room_players;
DROP POLICY IF EXISTS "Room players are viewable by self" ON room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON room_players;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_players;
DROP POLICY IF EXISTS "Users can update their ready status" ON room_players;
DROP POLICY IF EXISTS "Room participants can see all players in their rooms" ON room_players;

-- Let's try to drop any other policies that might exist
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON room_players;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON room_players;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON room_players;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON room_players;

-- 3. Create new clean policies
-- SELECT: All room participants can see each other
CREATE POLICY "room_participants_can_see_all_players" 
ON room_players FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_players rp_self
    WHERE rp_self.room_id = room_players.room_id 
    AND rp_self.player_id = auth.uid()
  )
);

-- INSERT: Users can join rooms
CREATE POLICY "users_can_join_rooms" 
ON room_players FOR INSERT 
WITH CHECK (player_id = auth.uid());

-- DELETE: Users can leave rooms (delete their own participation)
CREATE POLICY "users_can_leave_rooms" 
ON room_players FOR DELETE 
USING (player_id = auth.uid());

-- UPDATE: Users can update their own ready status
CREATE POLICY "users_can_update_ready_status" 
ON room_players FOR UPDATE 
USING (player_id = auth.uid());

-- 4. Grant permissions
GRANT ALL ON room_players TO authenticated;

-- 5. Test the policy with a specific query
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

-- 6. Verify new policies are correctly applied
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'room_players'
ORDER BY policyname;