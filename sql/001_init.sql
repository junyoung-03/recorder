-- extensions
create extension if not exists "pgcrypto";

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles (Supabase Auth 권장 구조)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- friendships
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_unique_pair unique (requester_id, addressee_id),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

create trigger trg_friendships_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

-- finance_records
create table if not exists public.finance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  amount numeric(12,2) not null,
  transaction_type text not null check (transaction_type in ('income','expense')),
  category text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_records_user_date_idx
on public.finance_records (user_id, record_date);

create trigger trg_finance_records_updated_at
before update on public.finance_records
for each row execute function public.set_updated_at();

-- schedules
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  time time,
  title text not null,
  memo text,
  category text,
  color text,
  repeat_type text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedules_user_date_idx
on public.schedules (user_id, record_date);

create trigger trg_schedules_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

-- todos
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todos_user_date_idx
on public.todos (user_id, record_date);

create trigger trg_todos_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

-- exercise_plans
create table if not exists public.exercise_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  body_part text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercise_plans_user_date_idx
on public.exercise_plans (user_id, record_date);

create trigger trg_exercise_plans_updated_at
before update on public.exercise_plans
for each row execute function public.set_updated_at();

-- exercise_records
create table if not exists public.exercise_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  body_part text not null,
  exercise_name text not null,
  sets integer,
  reps text,
  weight text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercise_records_user_date_idx
on public.exercise_records (user_id, record_date);

create trigger trg_exercise_records_updated_at
before update on public.exercise_records
for each row execute function public.set_updated_at();

-- body_records
create table if not exists public.body_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  image_path text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists body_records_user_date_idx
on public.body_records (user_id, record_date);

create trigger trg_body_records_updated_at
before update on public.body_records
for each row execute function public.set_updated_at();

-- journals
create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  title text,
  content text not null,
  category text,
  visibility text not null default 'private' check (visibility in ('private','friends','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journals_user_date_idx
on public.journals (user_id, record_date);

create trigger trg_journals_updated_at
before update on public.journals
for each row execute function public.set_updated_at();

-- journal_categories
create table if not exists public.journal_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_categories_unique unique (user_id, name)
);

create trigger trg_journal_categories_updated_at
before update on public.journal_categories
for each row execute function public.set_updated_at();

-- comments (journal)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid references public.journals(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_journal_idx on public.comments (journal_id);
create index if not exists comments_user_idx on public.comments (user_id);

create trigger trg_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

-- likes (journal)
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid references public.journals(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint likes_target_check check (journal_id is not null)
);

create unique index if not exists likes_unique_journal
on public.likes (user_id, journal_id) where journal_id is not null;

create index if not exists likes_journal_idx on public.likes (journal_id);
create index if not exists likes_user_idx on public.likes (user_id);

create trigger trg_likes_updated_at
before update on public.likes
for each row execute function public.set_updated_at();

