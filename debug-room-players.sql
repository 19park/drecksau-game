-- Debug room players issue
-- Run this in your Supabase SQL Editor

-- 1. Check current room_players data
SELECT 
  rp.room_id,
  rp.player_id,
  rp.player_order,
  rp.is_ready,
  p.email as profile_email,
  au.email as auth_email
FROM room_players rp
LEFT JOIN profiles p ON rp.player_id = p.id
LEFT JOIN auth.users au ON rp.player_id = au.id
WHERE rp.room_id = '42b047cf-8795-4542-bb1d-c3dca38190f6'  -- Replace with actual room ID
ORDER BY rp.player_order;

-- 2. Check if all users have profiles
SELECT 
  au.id,
  au.email,
  p.id as profile_id,
  p.email as profile_email,
  CASE 
    WHEN p.id IS NULL THEN 'MISSING PROFILE'
    ELSE 'HAS PROFILE'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10;

-- 3. Check the specific room
SELECT 
  r.*,
  creator_profile.email as creator_email
FROM rooms r
LEFT JOIN profiles creator_profile ON r.creator_id = creator_profile.id
WHERE r.id = '42b047cf-8795-4542-bb1d-c3dca38190f6';  -- Replace with actual room ID