-- Fix pig_index constraint to allow up to 5 pigs per player
-- According to Drecksau rules: 2 players get 5 pigs each

-- Drop the existing check constraint
ALTER TABLE player_pigs DROP CONSTRAINT player_pigs_pig_index_check;

-- Add new constraint allowing 1-5 pigs per player
ALTER TABLE player_pigs ADD CONSTRAINT player_pigs_pig_index_check CHECK (pig_index BETWEEN 1 AND 5);

-- Verify the constraint was updated
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'player_pigs'::regclass 
    AND conname = 'player_pigs_pig_index_check';

-- Test the updated constraint by trying to insert a pig with index 5
DO $$
DECLARE
    test_room_id UUID;
    test_player_id UUID;
BEGIN
    -- Get a test room and player (just for constraint validation)
    SELECT r.id, rp.player_id INTO test_room_id, test_player_id
    FROM rooms r
    JOIN room_players rp ON r.id = rp.room_id
    ORDER BY r.created_at DESC
    LIMIT 1;
    
    IF test_room_id IS NOT NULL AND test_player_id IS NOT NULL THEN
        -- Try inserting a pig with index 5 (should work now)
        INSERT INTO player_pigs (room_id, player_id, pig_index, pig_state)
        VALUES (test_room_id, test_player_id, 5, 'clean')
        ON CONFLICT (room_id, player_id, pig_index) DO NOTHING;
        
        -- Clean up the test data
        DELETE FROM player_pigs 
        WHERE room_id = test_room_id 
            AND player_id = test_player_id 
            AND pig_index = 5;
            
        RAISE NOTICE 'Constraint test passed: pig_index = 5 is now allowed';
    ELSE
        RAISE NOTICE 'No test data available, but constraint should be updated';
    END IF;
END
$$;