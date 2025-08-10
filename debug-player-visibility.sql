-- Debug player visibility issue
-- Run this in your Supabase SQL Editor

-- 1. Raw query - what the API should return
SELECT 
  rp.*,
  p.email as profile_email
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
WHERE rp.room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'  -- Replace with actual room ID
ORDER BY rp.player_order;

-- 2. Check profiles table completeness
SELECT 
  au.id,
  au.email as auth_email,
  p.email as profile_email,
  CASE WHEN p.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as profile_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.id IN (
  SELECT DISTINCT player_id 
  FROM room_players 
  WHERE room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
);

-- 3. Test the exact query that Supabase client uses
SELECT 
  rp.*,
  p.email
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
WHERE rp.room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'
ORDER BY rp.player_order;

-- 4. Check RLS policies on room_players table
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
WHERE tablename = 'room_players';

-- 5. If profiles are missing, create them
INSERT INTO profiles (id, email)
SELECT au.id, au.email 
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();