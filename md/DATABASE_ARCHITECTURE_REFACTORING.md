# Recorder DB 아키텍처 가이드 (Supabase RLS 기반)

## 0. 전제
- 현재 구조는 **React(Vite) + Supabase(Auth/DB/Storage)** 중심이다.
- 서버는 없고, 모든 권한은 **RLS**로 제어한다.
- 데이터 접근은 **Supabase JS client**로 수행한다.

---

## 1. 핵심 원칙

- **보이면 권한이 있는 것**이 원칙 (권한은 RLS가 보장)
- 클라이언트는 단순 조회/입력만 수행
- 공개/친구/개인 범위는 `visibility`와 `friendships`로 제어

---

## 2. 인증

- Supabase Auth 사용
- `supabase.auth.getUser()`로 사용자 식별
- `public.users.id = auth.uid()` 구조 사용

---

## 3. 도메인 구조

### 3.1 Private Domain (Owner-only)
대상 테이블:
- `finance_records`
- `schedules`
- `todos`
- `exercise_plans`
- `exercise_records`
- `body_records`

RLS 기준:
```sql
auth.uid() = user_id
```

---

## 4. Social Domain

### 4.1 Friendships
- 상태: `pending` / `accepted` / `blocked`
- 양방향 관계 확인 필요

### 4.2 Journals
- `visibility`: `private` / `friends` / `public`
- 친구 관계 + 공개 범위를 모두 고려

---

## 5. 데이터 접근 방식

- 모든 CRUD는 Supabase JS client로 수행
- Edge Function은 예외 케이스에만 사용

---

## 6. RLS 정책 설계 (도메인별)

### 6.1 Private Domain (Owner-only)
```sql
auth.uid() = user_id
```

### 6.2 Friendships
정책 예시:
- insert: `auth.uid() = user_id`
- update: `auth.uid() IN (user_id, friend_id)`
- select: `auth.uid() IN (user_id, friend_id)`
- delete: `auth.uid() IN (user_id, friend_id)`

공개 범위 규칙:
- private: 작성자만
- friends: 작성자 + 친구
- public: 로그인 사용자 전체(또는 모두)

정책 예시(개념):
```sql
(
  user_id = auth.uid()
  OR visibility = 'public'
  OR (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1
      FROM friendships f
      WHERE f.status = 'accepted'
        AND (
        )
    )
  )
)
```

### 6.4 Comments / Likes
- 댓글/좋아요는 대상 레코드 접근 권한이 있어야 허용
- 삭제는 작성자 또는 원글 작성자 가능하도록 정책 구성

---

## 7. 프론트엔드 연동 포인트

### 7.1 세션/유저 상태
- `currentUser`는 Supabase auth session에서 주입
- 프로필 데이터는 `public.users` 테이블에서 읽기

### 7.2 친구 뷰어
- `/friend/:id/*` 라우트는 유지
- 데이터 조회는 `friendships`와 RLS로 처리

---

## 8. 참고 사항
- 서버 없이 Supabase만 사용하는 구조다.
- 문서의 SQL은 실제 스키마와 맞는지 확인 후 적용한다.

---

## 9. RLS 정책 상세 (테이블별 SQL 초안)

> 아래 SQL은 Supabase SQL Editor 기준으로 작성한다.  
> `public` 스키마 기준이며, 필요 시 테이블/컬럼명은 실제 마이그레이션에 맞춰 조정한다.

### 9.1 공통: RLS 활성화
```sql
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
```

### 9.2 Private Domain (Owner-only)
```sql
CREATE POLICY "owner_select_finance" ON public.finance_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_finance" ON public.finance_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_finance" ON public.finance_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete_finance" ON public.finance_records
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "owner_select_schedule" ON public.schedules
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_schedule" ON public.schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_schedule" ON public.schedules
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete_schedule" ON public.schedules
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "owner_select_todos" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_todos" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_todos" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete_todos" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "owner_select_exercise_plans" ON public.exercise_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_exercise_plans" ON public.exercise_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_exercise_plans" ON public.exercise_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete_exercise_plans" ON public.exercise_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "owner_select_exercise_records" ON public.exercise_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_exercise_records" ON public.exercise_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_exercise_records" ON public.exercise_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete_exercise_records" ON public.exercise_records
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "owner_select_body_records" ON public.body_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_body_records" ON public.body_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_body_records" ON public.body_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete_body_records" ON public.body_records
  FOR DELETE USING (auth.uid() = user_id);
```

### 9.3 Friendships
```sql
CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT USING (auth.uid() IN (user_id, friend_id));
CREATE POLICY "friendships_insert" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friendships_update" ON public.friendships
  FOR UPDATE USING (auth.uid() IN (user_id, friend_id)) WITH CHECK (auth.uid() IN (user_id, friend_id));
CREATE POLICY "friendships_delete" ON public.friendships
  FOR DELETE USING (auth.uid() IN (user_id, friend_id));
```

```sql
  FOR SELECT USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
          )
      )
    )
  );
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "journal_select" ON public.journals
  FOR SELECT USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_id = journals.user_id)
            OR (f.friend_id = auth.uid() AND f.user_id = journals.user_id)
          )
      )
    )
  );
CREATE POLICY "journal_insert" ON public.journals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_update" ON public.journals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_delete" ON public.journals
  FOR DELETE USING (auth.uid() = user_id);
```

### 9.5 Journal Categories (Owner-only)
```sql
CREATE POLICY "journal_categories_select" ON public.journal_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_categories_insert" ON public.journal_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_categories_update" ON public.journal_categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_categories_delete" ON public.journal_categories
  FOR DELETE USING (auth.uid() = user_id);
```

### 9.6 Comments / Likes
```sql
CREATE POLICY "comment_select" ON public.comments
  FOR SELECT USING (
    EXISTS (
      AND (
        m.user_id = auth.uid()
        OR m.visibility = 'public'
        OR (
          m.visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.user_id = auth.uid() AND f.friend_id = m.user_id)
                OR (f.friend_id = auth.uid() AND f.user_id = m.user_id)
              )
          )
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.journals j
      WHERE j.id = comments.journal_id
      AND (
        j.user_id = auth.uid()
        OR j.visibility = 'public'
        OR (
          j.visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.user_id = auth.uid() AND f.friend_id = j.user_id)
                OR (f.friend_id = auth.uid() AND f.user_id = j.user_id)
              )
          )
        )
      )
    )
  );

CREATE POLICY "comment_insert" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_delete" ON public.comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
    )
    OR EXISTS (
      SELECT 1 FROM public.journals j
      WHERE j.id = comments.journal_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "like_select" ON public.likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "like_insert" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "like_delete" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 10. Storage 정책 (Supabase Storage)

### 10.1 버킷 구성
- `body` : 몸 기록 이미지 (signed URL)
- `photos` : 프로필 이미지 (public URL 권장)

### 10.2 객체 경로 규칙
- `body/{user_id}/{filename}`
- `photos/{user_id}/{filename}`

### 10.3 Storage RLS 정책 예시 (body)
```sql
CREATE POLICY "body_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'body'
    AND (auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "body_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'body'
    AND (auth.uid()::text = (storage.foldername(name))[1])
  );
```

---

## 11. 인덱스/성능 권장

```sql
CREATE INDEX IF NOT EXISTS idx_finance_user_date ON public.finance_records (user_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_user_date ON public.schedules (user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_user_date ON public.todos (user_id, date);
CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON public.exercise_records (user_id, date);
CREATE INDEX IF NOT EXISTS idx_body_user_date ON public.body_records (user_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.journals (user_id, date);
CREATE INDEX IF NOT EXISTS idx_friendship_user_friend ON public.friendships (user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_friendship_friend_user ON public.friendships (friend_id, user_id);
```

---

## 12. 초기 세팅 단계 요약

1) Supabase 프로젝트 생성, Auth 활성화  
2) Postgres 테이블 생성  
3) RLS 및 정책 적용  
4) Storage 버킷 생성 + RLS  
5) 프론트에서 Supabase JS로 연결  
6) Vercel 배포  

---

## 13. 테이블 스키마 (public.users 기준 DDL 초안)

> 아래는 현재 Flask SQLAlchemy 모델 기준의 SQL 스키마 초안이다.  
> 실제 적용 시 `uuid` 기반 사용자 키 사용을 권장한다.

```sql
-- Users (public 프로필 테이블)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  nickname text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.finance_records (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric NOT NULL,
  transaction_type text NOT NULL,
  category text,
  memo text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schedules (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time,
  title text NOT NULL,
  memo text,
  category text,
  color text,
  repeat_type text,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todos (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_plans (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  body_part text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_records (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  body_part text NOT NULL,
  exercise_name text NOT NULL,
  sets integer,
  reps text,
  weight text,
  total_time integer,
  weight_kg numeric,
  memo text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.body_records (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  image_path text,
  memo text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journals (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text,
  content text NOT NULL,
  category text,
  visibility text DEFAULT 'private',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_categories (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journal_id bigint REFERENCES public.journals(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.likes (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journal_id bigint REFERENCES public.journals(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, journal_id)
);
```

---

## 14. Auth 프로필 테이블 동기화 (권장)

### 14.1 Trigger로 public.users 자동 생성
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, nickname)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'username', new.email), new.raw_user_meta_data->>'nickname');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 14.2 Auth 삭제 시 프로필 정리
```sql
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete();
```

---

## 15. Edge Function 필요 구간 (예외 케이스)

다음은 클라이언트에서 직접 처리하기 어려운 경우에만 Edge Function을 사용한다:
- 대량 Export (CSV/JSON) 처리
- 공개 공유 링크(서명 URL) 생성
- 외부 API 연동 (예: 날씨/운세)
- 관리자 전용 백오피스 (RLS 우회 필요 시)

---

## 16. 프론트엔드 Supabase 클라이언트 가이드

### 16.1 설치
```bash
npm install @supabase/supabase-js
```

### 16.2 초기화
```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 16.3 예시: 본인 가계부 조회
```ts
const { data, error } = await supabase
  .from('finance_records')
  .select('*')
  .order('date', { ascending: false });
```

### 16.4 예시: 일정 추가
```ts
const { data, error } = await supabase
  .from('schedules')
  .insert([{ user_id: userId, date, title, memo }]);
```

### 16.5 예시: 로그인
```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

