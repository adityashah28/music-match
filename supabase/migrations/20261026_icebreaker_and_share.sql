-- Icebreaker chat + mutual socials sharing (from feature/icebreaker-and-share).
-- Production was failing every store load because these tables were only in schema.sql.

-- Explicit opt-in to share socials (separate from match_interest).
create table if not exists match_share (
  user_id uuid not null references users (id) on delete cascade,
  other_user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_user_id),
  check (user_id <> other_user_id)
);

create index if not exists match_share_other_idx on match_share (other_user_id);

-- Icebreaker prompts between mutual matches.
create table if not exists match_icebreaker (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users (id) on delete cascade,
  recipient_id uuid not null references users (id) on delete cascade,
  prompt_id text not null,
  prompt_text text not null,
  -- Null opens a new round; otherwise reply closing that round's prompt.
  reply_to_id uuid references match_icebreaker (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists match_icebreaker_recipient_idx on match_icebreaker (recipient_id);

do $rls$
declare
  tbl text;
begin
  foreach tbl in array array['match_share', 'match_icebreaker']
  loop
    execute format('alter table public.%I enable row level security', tbl);
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
$rls$;
