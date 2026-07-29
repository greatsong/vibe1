-- ============================================================
-- 2026 정보교사 1급 정교사 자격연수 · 데이터 바이브 코딩
-- 작품 갤러리 — Supabase 스키마
--
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 Run 하면 끝납니다.
-- 여러 번 실행해도 안전합니다(모두 if not exists / or replace).
--
-- ⚠️ 이 연수용 표는 이름이 전부 vibe1_ 로 시작합니다.
--    서울대 15시간 과정이 쓰는 apps / feedback 표는 건드리지 않습니다.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 개인 작품 (vibe1_apps) ----------
create table if not exists public.vibe1_apps (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  assignment   text not null constraint vibe1_apps_assignment_check check (assignment in (
                 'STEP 1 · 인구·고령화 지도',
                 'STEP 2 · 박스오피스',
                 'STEP 3 · AI 채팅앱',
                 'STEP 4 · 합친 사이트'
               )),
  nickname     text not null check (char_length(nickname) between 1 and 20),
  url          text not null check (url ~ '^https://'),
  description  text not null check (char_length(description) between 1 and 100),
  likes        integer not null default 0 check (likes >= 0)
);

create index if not exists vibe1_apps_assignment_idx on public.vibe1_apps (assignment);

-- 산출물 종류 목록을 최신 상태로 맞춘다.
-- create table 은 표가 이미 있으면 아무 일도 하지 않으므로, 종류가 바뀌었을 때는
-- 이 블록이 제약을 다시 걸어 준다. 여러 번 실행해도 결과가 같다.
-- (이미 사라진 종류로 올라온 작품이 남아 있으면 여기서 오류가 난다.
--  그때는 Table Editor 에서 그 행의 assignment 를 남아 있는 종류로 고친 뒤 다시 실행한다.)
alter table public.vibe1_apps drop constraint if exists vibe1_apps_assignment_check;
alter table public.vibe1_apps add constraint vibe1_apps_assignment_check
  check (assignment in (
    'STEP 1 · 인구·고령화 지도',
    'STEP 2 · 박스오피스',
    'STEP 3 · AI 채팅앱',
    'STEP 4 · 합친 사이트'
  ));

-- ---------- 한 줄 피드백 (vibe1_feedback) ----------
create table if not exists public.vibe1_feedback (
  id           uuid primary key default gen_random_uuid(),
  app_id       uuid not null references public.vibe1_apps (id) on delete cascade,
  created_at   timestamptz not null default now(),
  nickname     text not null check (char_length(nickname) between 1 and 16),
  content      text not null check (char_length(content) between 1 and 80)
);

create index if not exists vibe1_feedback_app_id_idx on public.vibe1_feedback (app_id);

-- ============================================================
-- RLS (Row Level Security)
-- 누구나 읽고(select) 새로 쓸(insert) 수 있습니다.
-- 수정(update)·삭제(delete)는 정책을 만들지 않아 전면 차단됩니다.
-- 좋아요 증가만 아래 RPC 함수를 거쳐 허용됩니다.
-- ============================================================

alter table public.vibe1_apps enable row level security;
alter table public.vibe1_feedback enable row level security;

drop policy if exists "vibe1_apps_public_select" on public.vibe1_apps;
create policy "vibe1_apps_public_select" on public.vibe1_apps
  for select using (true);

drop policy if exists "vibe1_apps_public_insert" on public.vibe1_apps;
create policy "vibe1_apps_public_insert" on public.vibe1_apps
  for insert with check (true);

drop policy if exists "vibe1_feedback_public_select" on public.vibe1_feedback;
create policy "vibe1_feedback_public_select" on public.vibe1_feedback
  for select using (true);

drop policy if exists "vibe1_feedback_public_insert" on public.vibe1_feedback;
create policy "vibe1_feedback_public_insert" on public.vibe1_feedback
  for insert with check (true);

-- ============================================================
-- 좋아요 증가 RPC
-- - UPDATE 한 줄로 처리하므로 여러 명이 동시에 눌러도 숫자가 어긋나지 않습니다.
-- - security definer: 함수 소유자 권한으로 실행되어, 표에 update 정책이 없어도
--   likes 열만 안전하게 늘릴 수 있습니다. 클라이언트는 이 함수 밖에서
--   likes 를 직접 수정할 수 없습니다.
-- ============================================================

create or replace function public.vibe1_increment_likes(p_app_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_likes integer;
begin
  update public.vibe1_apps
     set likes = likes + 1
   where id = p_app_id
  returning likes into new_likes;

  if new_likes is null then
    raise exception 'app not found: %', p_app_id;
  end if;

  return new_likes;
end;
$$;

revoke all on function public.vibe1_increment_likes(uuid) from public;
grant execute on function public.vibe1_increment_likes(uuid) to anon, authenticated;

-- ============================================================
-- 좋아요 위조 방지
-- insert 로 likes 값을 어떻게 보내든 항상 0으로 덮어씁니다.
-- 증가는 위 RPC 로만 가능합니다.
-- ============================================================

create or replace function public.vibe1_force_likes_zero()
returns trigger language plpgsql as $$
begin
  new.likes := 0;
  return new;
end;
$$;

drop trigger if exists trg_vibe1_force_likes_zero on public.vibe1_apps;
create trigger trg_vibe1_force_likes_zero
  before insert on public.vibe1_apps
  for each row execute function public.vibe1_force_likes_zero();
