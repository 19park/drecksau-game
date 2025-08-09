-- 드렉사우 게임 데이터베이스 - Realtime 권한 설정
-- Supabase Realtime을 위한 권한 설정

-- Realtime 권한 설정 (Broadcast/Presence 사용을 위함)
CREATE POLICY "Enable realtime for authenticated users" ON "realtime"."messages" 
FOR ALL USING (auth.role() = 'authenticated');

-- 테이블별 Realtime 활성화를 위한 권한 부여 (필요시)
-- 다음 명령어들은 Supabase Dashboard > Database > Replication에서 수동으로 설정하는 것을 권장합니다.

-- 참고: 다음 테이블들을 Realtime Publication에 추가해야 합니다 (Dashboard에서 수행):
-- - rooms
-- - room_players  
-- - game_states
-- - player_pigs
-- - player_hands
-- - game_deck
-- - discarded_cards
-- - game_logs

-- 또는 SQL로 직접 설정하려면 다음 명령어 사용:
/*
-- Realtime publication 생성 (기본적으로 supabase_realtime이 존재)
-- DROP PUBLICATION IF EXISTS supabase_realtime;
-- CREATE PUBLICATION supabase_realtime;

-- 테이블을 publication에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE player_pigs;
ALTER PUBLICATION supabase_realtime ADD TABLE player_hands;
ALTER PUBLICATION supabase_realtime ADD TABLE game_deck;
ALTER PUBLICATION supabase_realtime ADD TABLE discarded_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE game_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_players;
*/