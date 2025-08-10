-- Fix RLS policies with correct table names
-- Run this in your Supabase SQL Editor

-- 1. First, check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('game_states', 'player_pigs', 'player_hands', 'game_deck', 'discarded_cards', 'game_logs')
ORDER BY tablename, policyname;

-- 2. Enable RLS on all game tables (if not already enabled)
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_pigs ENABLE ROW LEVEL SECURITY;  
ALTER TABLE player_hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_deck ENABLE ROW LEVEL SECURITY;
ALTER TABLE discarded_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;

-- 3. Game_states table policies
DROP POLICY IF EXISTS "Game states are viewable by room participants" ON game_states;
DROP POLICY IF EXISTS "Room creators can create game states" ON game_states;
DROP POLICY IF EXISTS "Room creators can update game states" ON game_states;

-- Game states SELECT: Anyone in the room can view the game state
CREATE POLICY "Game states are viewable by room participants" 
ON game_states FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = game_states.room_id 
    AND rp.player_id = auth.uid()
  )
);

-- Game states INSERT: Room creator can start game
CREATE POLICY "Room creators can create game states" 
ON game_states FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rooms r 
    WHERE r.id = room_id 
    AND r.creator_id = auth.uid()
  )
);

-- Game states UPDATE: Room creator can update game state
CREATE POLICY "Room creators can update game states" 
ON game_states FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM rooms r 
    WHERE r.id = room_id 
    AND r.creator_id = auth.uid()
  )
);

-- 4. Player_pigs table policies
DROP POLICY IF EXISTS "Player pigs are viewable by room participants" ON player_pigs;
DROP POLICY IF EXISTS "System can create player pigs" ON player_pigs;
DROP POLICY IF EXISTS "System can update player pigs" ON player_pigs;

-- Player pigs SELECT: Anyone in the room can view all pigs
CREATE POLICY "Player pigs are viewable by room participants" 
ON player_pigs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = player_pigs.room_id 
    AND rp.player_id = auth.uid()
  )
);

-- Player pigs INSERT: Anyone in the room can create pigs (for game initialization)
CREATE POLICY "System can create player pigs" 
ON player_pigs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = room_id 
    AND rp.player_id = auth.uid()
  )
);

-- Player pigs UPDATE: Anyone in the room can update pigs (for card effects)
CREATE POLICY "System can update player pigs" 
ON player_pigs FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = player_pigs.room_id 
    AND rp.player_id = auth.uid()
  )
);

-- 5. Player_hands table policies (KEY FIX FOR THE ORIGINAL ERROR)
DROP POLICY IF EXISTS "Players can view own cards" ON player_hands;
DROP POLICY IF EXISTS "System can deal cards" ON player_hands;
DROP POLICY IF EXISTS "Players can discard cards" ON player_hands;

-- Player_hands SELECT: Players can only see their own cards
CREATE POLICY "Players can view own cards" 
ON player_hands FOR SELECT 
USING (player_id = auth.uid());

-- Player_hands INSERT: Anyone in the game can deal cards (for initialization and drawing)
CREATE POLICY "System can deal cards" 
ON player_hands FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = room_id 
    AND rp.player_id = auth.uid()
  )
);

-- Player_hands UPDATE: Players can update their own card counts
CREATE POLICY "Players can update own cards" 
ON player_hands FOR UPDATE 
USING (player_id = auth.uid());

-- Player_hands DELETE: Players can delete their own cards
CREATE POLICY "Players can discard cards" 
ON player_hands FOR DELETE 
USING (player_id = auth.uid());

-- 6. Game_deck table policies
DROP POLICY IF EXISTS "Game deck is viewable by room participants" ON game_deck;
DROP POLICY IF EXISTS "System can manage game deck" ON game_deck;

-- Game deck SELECT: Anyone in the room can view deck state
CREATE POLICY "Game deck is viewable by room participants" 
ON game_deck FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = game_deck.room_id 
    AND rp.player_id = auth.uid()
  )
);

-- Game deck INSERT/UPDATE: Anyone in the game can manage deck
CREATE POLICY "System can manage game deck" 
ON game_deck FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = game_deck.room_id 
    AND rp.player_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = room_id 
    AND rp.player_id = auth.uid()
  )
);

-- 7. Discarded_cards table policies
DROP POLICY IF EXISTS "Discarded cards are viewable by room participants" ON discarded_cards;
DROP POLICY IF EXISTS "System can manage discarded cards" ON discarded_cards;

CREATE POLICY "Discarded cards are viewable by room participants" 
ON discarded_cards FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = discarded_cards.room_id 
    AND rp.player_id = auth.uid()
  )
);

CREATE POLICY "System can manage discarded cards" 
ON discarded_cards FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = discarded_cards.room_id 
    AND rp.player_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = room_id 
    AND rp.player_id = auth.uid()
  )
);

-- 8. Game_logs table policies
DROP POLICY IF EXISTS "Game logs are viewable by room participants" ON game_logs;
DROP POLICY IF EXISTS "Players can create game logs" ON game_logs;

CREATE POLICY "Game logs are viewable by room participants" 
ON game_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = game_logs.room_id 
    AND rp.player_id = auth.uid()
  )
);

CREATE POLICY "Players can create game logs" 
ON game_logs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = room_id 
    AND rp.player_id = auth.uid()
  )
);

-- 9. Grant necessary permissions
GRANT ALL ON game_states TO authenticated;
GRANT ALL ON player_pigs TO authenticated; 
GRANT ALL ON player_hands TO authenticated;
GRANT ALL ON game_deck TO authenticated;
GRANT ALL ON discarded_cards TO authenticated;
GRANT ALL ON game_logs TO authenticated;

-- 10. Check if policies are created correctly
SELECT 'Game_states policies' as table_name, count(*) as policy_count 
FROM pg_policies WHERE tablename = 'game_states'
UNION ALL
SELECT 'Player_pigs policies', count(*) FROM pg_policies WHERE tablename = 'player_pigs'  
UNION ALL
SELECT 'Player_hands policies', count(*) FROM pg_policies WHERE tablename = 'player_hands'
UNION ALL  
SELECT 'Game_deck policies', count(*) FROM pg_policies WHERE tablename = 'game_deck'
UNION ALL
SELECT 'Discarded_cards policies', count(*) FROM pg_policies WHERE tablename = 'discarded_cards'
UNION ALL
SELECT 'Game_logs policies', count(*) FROM pg_policies WHERE tablename = 'game_logs';