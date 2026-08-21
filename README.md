# 3학년 2반 입시

실시간 수시 상담 신청 및 수시 원서 카드 관리 웹앱. Next.js (App Router) + Supabase(Auth/DB/Realtime/Storage)로 제작.

## 처음 설정하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 생성한다.
2. **Project Settings > API**에서 `Project URL`, `anon public` key, `service_role` key를 확인한다.
3. **SQL Editor**에서 [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) 파일 내용을 전체 실행한다. (테이블, RLS 정책, RPC 함수, Storage 버킷이 모두 생성됨)

### 2. 환경 변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채운다.

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: 1번에서 확인한 값
- `TEACHER_INTERNAL_EMAIL`: 교사 계정용 내부 이메일 (기본값 그대로 둬도 됨, 화면에는 노출되지 않음)
- `TEACHER_INITIAL_PASSWORD`: 선생님 모드에 처음 로그인할 때 사용할 비밀번호 (이후 앱 안에서 변경 가능)

### 3. 교사 계정 생성 (최초 1회)

```bash
npm install
npm run seed:teacher
```

### 4. 로컬 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속 → 우측 상단 "선생님 모드"로 로그인 → 학생 명단 관리 탭에서 명단을 등록하면 학생들이 로그인할 수 있다.

## Vercel 배포

1. 이 저장소를 GitHub에 올리고 Vercel에서 Import 한다.
2. Vercel 프로젝트의 Environment Variables에 `.env.local`과 동일한 5개 값을 등록한다.
3. 배포 후 발급된 도메인을 학생들에게 공유하면 휴대폰 브라우저로 접속할 수 있다.

## 폴더 구조

- `src/app` — 라우트 (`/` 로그인, `/student`, `/teacher`, `api/*`)
- `src/components` — 화면 컴포넌트 (student/teacher/wonseo/ui/providers)
- `src/lib` — Supabase 클라이언트, 타입, 훅, 유틸
- `supabase/migrations` — DB 스키마 · RLS · RPC SQL
- `scripts/seed-teacher.ts` — 교사 계정 시드 스크립트
