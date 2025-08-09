-- 드렉사우 게임 데이터베이스 - 기본 테이블 생성
-- UUID 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 게임방 테이블
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    max_players INTEGER NOT NULL DEFAULT 4 CHECK (max_players BETWEEN 2 AND 4),
    current_players INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    creator_id UUID REFERENCES auth.users(id),
    is_expansion BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게임방 플레이어 테이블
CREATE TABLE room_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id),
    player_order INTEGER NOT NULL CHECK (player_order BETWEEN 1 AND 4),
    is_ready BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id),
    UNIQUE(room_id, player_order)
);

-- 게임 상태 테이블
CREATE TABLE game_states (
    room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    current_player_order INTEGER NOT NULL DEFAULT 1,
    game_phase VARCHAR(20) NOT NULL DEFAULT 'setup' CHECK (game_phase IN ('setup', 'playing', 'finished')),
    winner_player_id UUID REFERENCES auth.users(id),
    deck_remaining INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 카드 타입 정의
CREATE TYPE card_type AS ENUM (
    'mud',           -- 진흙 카드 (21장)
    'rain',          -- 비 카드 (4장)
    'lightning',     -- 벼락 카드 (4장)
    'lightning_rod', -- 피뢰침 카드 (4장)
    'barn',          -- 헛간 카드 (9장)
    'barn_lock',     -- 헛간잠금 카드 (4장)
    'bath',          -- 목욕 카드 (8장)
    'beautiful_pig', -- 아름다운 돼지 카드 (16장) - 확장판
    'escape',        -- 도망 카드 (12장) - 확장판
    'lucky_bird'     -- 행운의 새 카드 (4장) - 확장판
);

-- 플레이어별 돼지 상태 테이블
CREATE TABLE player_pigs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id),
    pig_index INTEGER NOT NULL CHECK (pig_index BETWEEN 1 AND 3),
    pig_state VARCHAR(20) NOT NULL DEFAULT 'clean' CHECK (pig_state IN ('clean', 'dirty', 'beautiful')),
    has_barn BOOLEAN NOT NULL DEFAULT false,
    barn_locked BOOLEAN NOT NULL DEFAULT false,
    has_lightning_rod BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id, pig_index)
);

-- 플레이어 손패 테이블
CREATE TABLE player_hands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id),
    card_type card_type NOT NULL,
    card_count INTEGER NOT NULL DEFAULT 1 CHECK (card_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id, card_type)
);

-- 게임 덱 상태 테이블
CREATE TABLE game_deck (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    card_type card_type NOT NULL,
    remaining_count INTEGER NOT NULL DEFAULT 0 CHECK (remaining_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, card_type)
);

-- 버려진 카드 테이블
CREATE TABLE discarded_cards (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    card_type card_type NOT NULL,
    discarded_count INTEGER NOT NULL DEFAULT 0 CHECK (discarded_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, card_type)
);

-- 게임 액션 로그 테이블
CREATE TABLE game_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id),
    action_type VARCHAR(50) NOT NULL,
    action_details JSONB,
    turn_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 토너먼트 테이블 (확장판)
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    max_rounds INTEGER NOT NULL DEFAULT 5,
    current_round INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    creator_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 토너먼트 플레이어 테이블
CREATE TABLE tournament_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id),
    bucket_tokens INTEGER NOT NULL DEFAULT 0,
    trophy_tokens INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER GENERATED ALWAYS AS (bucket_tokens + trophy_tokens) STORED,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, player_id)
);