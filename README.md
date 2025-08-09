# 🐷 Drecksau Game

실시간 멀티플레이어 드렉사우 보드게임

## 🎮 게임 소개

드렉사우는 깨끗한 돼지들을 더럽게 만드는 것이 목표인 재미있는 보드게임입니다. 
친구들과 함께 실시간으로 즐길 수 있는 온라인 멀티플레이어 게임으로 구현했습니다.

### 주요 특징

- 🌐 **실시간 멀티플레이어**: 최대 4명이 동시에 플레이
- ⚡ **실시간 동기화**: Supabase Realtime을 활용한 즉시 반영
- 🎯 **전략적 게임플레이**: 다양한 카드를 활용한 깊이 있는 전략
- 🎨 **트렌디한 UI**: Tailwind CSS로 구현한 모던하고 게임다운 디자인
- 🏆 **토너먼트 지원**: 확장판 규칙으로 토너먼트 진행 가능

## 🛠️ 기술 스택

- **Frontend**: Vue 3 + TypeScript + Composition API
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **State Management**: Pinia
- **Build Tool**: Vite
- **Authentication**: Supabase Auth

## 📋 요구사항

- Node.js 18+ 
- Supabase 프로젝트

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`를 복사하여 `.env` 파일을 생성하고 Supabase 설정을 입력하세요:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 데이터베이스 설정

제공된 SQL 스키마를 Supabase 프로젝트에 적용하세요.

### 4. 개발 서버 실행

```bash
npm run dev
```

### 5. 빌드

```bash
npm run build
```

## 🎯 게임 규칙

### 기본 규칙

1. **목표**: 자신의 모든 돼지를 더럽게 만들기
2. **턴**: 카드 1장 사용 또는 버리기 → 카드 1장 뽑기
3. **승리**: 가장 먼저 모든 돼지를 더럽게 만든 플레이어 승리

### 주요 카드

- **💩 진흙카드**: 자신의 돼지를 더럽게 만듦
- **🏠 헛간카드**: 돼지를 비로부터 보호
- **🛁 목욕카드**: 상대방의 더러운 돼지를 깨끗하게 만듦
- **🌧️ 비카드**: 헛간 밖의 모든 더러운 돼지를 깨끗하게 만듦
- **⚡ 벼락카드**: 상대방의 헛간을 태워버림
- **🔌 피뢰침카드**: 헛간을 벼락으로부터 보호
- **🔒 헛간잠금카드**: 헛간 안의 돼지가 목욕당하는 것을 방지

### 확장판 (아름다운 돼지)

- **💄 아름다운 돼지카드**: 돼지를 아름답게 만듦 (비에 젖지 않음)
- **🏃 도망카드**: 아름다운 돼지카드를 제거
- **🐦 행운의 새카드**: 손의 모든 카드를 즉시 사용

## 📁 프로젝트 구조

```
src/
├── components/     # 재사용 가능한 컴포넌트
├── views/          # 페이지 컴포넌트
├── stores/         # Pinia 스토어
├── types/          # TypeScript 타입 정의
├── lib/            # 라이브러리 설정
├── composables/    # Vue 컴포저블
├── utils/          # 유틸리티 함수
└── router/         # Vue Router 설정
```

## 🎨 디자인 시스템

### 색상 팔레트

- **Primary**: 주황색 계열 (게임의 활기찬 느낌)
- **Secondary**: 파란색 계열 (신뢰감)  
- **Mud**: 갈색 계열 (진흙 테마)

### 애니메이션

- **bounce-soft**: 부드러운 바운스 효과
- **wiggle**: 돼지가 더러워졌을 때 흔들림
- **splash**: 카드 효과 시 스플래시
- **card-flip**: 카드 뒤집기 효과

## 📝 개발 스크립트

```bash
# 개발 서버 실행
npm run dev

# 타입 체크
npm run typecheck

# 린팅
npm run lint

# 포매팅
npm run format

# 빌드
npm run build

# 프리뷰
npm run preview
```

## 🔧 개발 환경

- ESLint: 코드 품질 관리
- Prettier: 코드 포매팅
- TypeScript: 타입 안정성
- Vue DevTools: 개발 도구

## 📞 지원

이슈가 있거나 제안사항이 있다면 GitHub Issues에 등록해주세요.

---

즐거운 게임 되세요! 🐷💩