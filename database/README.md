# 🐷 드렉사우 게임 데이터베이스 설치 가이드

Supabase 프로젝트에 드렉사우 게임 데이터베이스를 설정하기 위한 SQL 스크립트들입니다.

## 📋 설치 순서

Supabase Dashboard → Database → SQL Editor에서 다음 순서대로 스크립트를 실행해주세요:

### 1️⃣ **기본 테이블 생성**
```sql
-- 파일: 01_create_tables.sql
```
- 게임방, 플레이어, 게임 상태 등 모든 기본 테이블 생성
- 카드 타입 ENUM 정의
- 외래키 제약조건 설정

### 2️⃣ **인덱스 생성**
```sql  
-- 파일: 02_create_indexes.sql
```
- 성능 최적화를 위한 인덱스들
- 검색과 조인 성능 향상

### 3️⃣ **RLS 정책 설정**
```sql
-- 파일: 03_create_rls_policies.sql
```
- Row Level Security 활성화
- 사용자별 데이터 접근 권한 설정
- 게임 보안 정책 적용

### 4️⃣ **Realtime 권한 설정**
```sql
-- 파일: 04_realtime_permissions.sql  
```
- Supabase Realtime을 위한 권한 설정
- Broadcast/Presence 기능 활성화

### 5️⃣ **게임 로직 함수**
```sql
-- 파일: 05_game_functions.sql
```
- 게임 초기화 함수들
- 카드 뽑기, 덱 관리 함수
- 승패 판정 함수

### 6️⃣ **트리거 설정** (선택사항)
```sql
-- 파일: 06_triggers.sql
```
- 자동화된 데이터 관리
- 게임 로그 자동 생성
- 플레이어 수 자동 업데이트

## 🎯 Realtime Publication 설정

Supabase Dashboard → Database → Replication에서 다음 테이블들을 `supabase_realtime` publication에 추가해주세요:

- ✅ `rooms`
- ✅ `room_players`  
- ✅ `game_states`
- ✅ `player_pigs`
- ✅ `player_hands`
- ✅ `game_deck`
- ✅ `discarded_cards`
- ✅ `game_logs`

## 🔧 주요 함수 사용법

### 게임 시작
```sql
SELECT start_game('room_uuid_here');
```

### 카드 뽑기
```sql
SELECT draw_card('room_uuid', 'player_uuid');
```

### 승부 판정
```sql
SELECT check_game_winner('room_uuid', 'player_uuid');
```

## 📊 테이블 구조 요약

### 🏠 게임방 관련
- `rooms`: 게임방 정보
- `room_players`: 방 참가자 정보
- `game_states`: 게임 진행 상태

### 🐷 게임 데이터
- `player_pigs`: 각 플레이어의 돼지 상태
- `player_hands`: 플레이어 손패
- `game_deck`: 게임 덱 상태
- `discarded_cards`: 버린 카드더미

### 📝 로그 및 기록
- `game_logs`: 게임 액션 로그
- `tournaments`: 토너먼트 정보 (확장판)
- `tournament_players`: 토너먼트 참가자

## 🛡️ 보안 특징

- **RLS 활성화**: 모든 테이블에 Row Level Security 적용
- **사용자별 접근제어**: 자신이 참가한 게임만 접근 가능
- **손패 보안**: 각 플레이어는 자신의 손패만 볼 수 있음
- **방장 권한**: 방 생성자만 방 설정 변경 가능

## ✅ 설치 확인

모든 스크립트 실행 후 다음 쿼리로 설치 확인:

```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rooms', 'room_players', 'game_states', 'player_pigs');

-- 함수 생성 확인  
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('start_game', 'draw_card', 'check_game_winner');
```

## 🚨 주의사항

1. **스크립트 순서**: 반드시 순서대로 실행해주세요
2. **권한 설정**: Realtime publication 설정을 잊지 마세요
3. **테스트**: 설치 후 간단한 쿼리로 동작 확인
4. **백업**: 중요한 데이터가 있다면 사전 백업 권장

## 🎮 다음 단계

데이터베이스 설정 완료 후:

1. 프론트엔드 애플리케이션 실행 (`npm run dev`)
2. 회원가입/로그인 테스트
3. 게임방 생성 및 참여 테스트
4. 실시간 통신 확인

모든 설정이 완료되면 개발팀에게 알려주세요! 🚀