-- Socials sharing and icebreakers between matches (tables added to schema.sql without a migration).
-- The app loads both tables on every request, so they must exist before that code is deployed.

-- Explicit, separate from match_interest: each side opts in to sharing their own socials.
-- Only revealed to either side once both rows exist (checked in the route handler).
create table if not exists match_share (
  user_id uuid not null references users (id) on delete cascade,
  other_user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_user_id),
  check (user_id <> other_user_id)
);

create index if not exists match_share_other_idx on match_share (other_user_id);

-- One-way: user_id hid other_user_id from their matches. Never shown to other_user_id.
create table if not exists match_skip (
  user_id uuid not null references users (id) on delete cascade,
  other_user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_user_id),
  check (user_id <> other_user_id)
);

-- A running thread of icebreaker prompts between two matched users. Either side can send
-- any number of times. Only sent once match_interest exists both ways, enforced in the route handler.
create table if not exists match_icebreaker (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users (id) on delete cascade,
  recipient_id uuid not null references users (id) on delete cascade,
  prompt_id text not null,
  prompt_text text not null,
  -- Null means this opens a new round. Otherwise it's the reply to that round's prompt,
  -- closing it. Nobody can open a new round while one is still open.
  reply_to_id uuid references match_icebreaker (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists match_icebreaker_recipient_idx on match_icebreaker (recipient_id);

-- Same lockdown as every other table: only the service role (our API routes) can read or write.
alter table public.match_share enable row level security;
alter table public.match_icebreaker enable row level security;

do $share_rls$
declare
  tbl text;
begin
  foreach tbl in array array['match_share', 'match_icebreaker']
  loop
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table public.%I from anon', tbl);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table public.%I from authenticated', tbl);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant all on table public.%I to service_role', tbl);
    end if;
  end loop;
end
$share_rls$;
