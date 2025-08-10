-- Debug game_states realtime issues
-- Run this in your Supabase SQL Editor

-- 1. Check if realtime is enabled for game_states
SELECT c.relname as tablename, c.relreplident as replica_identity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'game_states';

-- 2. Check RLS policies on game_states
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'game_states';

-- 3. Check current game_states data
SELECT room_id, current_player_order, game_phase, created_at, updated_at 
FROM game_states 
ORDER BY updated_at DESC 
LIMIT 5;

-- 4. Enable realtime for game_states if not enabled
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;

-- 5. Check if the publication was added
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'game_states';