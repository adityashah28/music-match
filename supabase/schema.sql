-- Resonate tables. Route handlers use the service role. Anon and authenticated
-- have no policies and no grants, so socials cannot be read with the public key.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  handle text,
  city text,
  instagram text,
  tiktok text,
  snapchat text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  -- Secret the browser keeps after signup and sends as "Authorization: Bearer <token>".
  -- Proves a request really comes from this user. Never returned by any route except signup.
  token uuid unique default gen_random_uuid()
);

create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  image_url text,
  dominant_color_hex text,
  monthly_listeners integer,
  genres text[] not null default '{}',
  spotify_id text,
  source text,
  updated_at timestamptz not null default now(),
  -- Filled by the seed scripts (scripts/seed-artists.ts)
  deezer_id text,
  fan_count integer,
  related_fetched_at timestamptz
);

create unique index if not exists artists_normalized_name_key on artists (normalized_name);
create unique index if not exists artists_spotify_id_key on artists (spotify_id) where spotify_id is not null;
create unique index if not exists artists_deezer_id_key on artists (deezer_id) where deezer_id is not null;

create table if not exists artist_related (
  artist_id uuid not null references artists (id) on delete cascade,
  related_artist_id uuid not null references artists (id) on delete cascade,
  rank integer not null,
  primary key (artist_id, related_artist_id),
  check (artist_id <> related_artist_id)
);

create table if not exists user_artists (
  user_id uuid not null references users (id) on delete cascade,
  artist_id uuid not null references artists (id) on delete cascade,
  position integer not null check (position between 1 and 5),
  primary key (user_id, artist_id),
  unique (user_id, position)
);

create index if not exists user_artists_artist_idx on user_artists (artist_id);

create table if not exists shows (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  normalized_artist_name text not null,
  venue text,
  city text,
  starts_at timestamptz,
  ticket_url text,
  source text,
  updated_at timestamptz not null default now(),
  -- The event's id in its source, so re-running the shows seed updates instead of duplicating
  source_id text,
  image_url text
);

create index if not exists shows_normalized_artist_name_idx on shows (normalized_artist_name);
create index if not exists shows_starts_at_idx on shows (starts_at);
create unique index if not exists shows_source_key on shows (source, source_id);

create table if not exists show_rsvps (
  user_id uuid not null references users (id) on delete cascade,
  show_id uuid not null references shows (id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'not_going')),
  primary key (user_id, show_id)
);

create index if not exists show_rsvps_show_idx on show_rsvps (show_id);

create table if not exists match_interest (
  user_id uuid not null references users (id) on delete cascade,
  other_user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_user_id),
  check (user_id <> other_user_id)
);

create index if not exists match_interest_other_idx on match_interest (other_user_id);

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

create table if not exists search_cache (
  query text primary key,
  results jsonb not null,
  created_at timestamptz not null default now()
);

comment on table users is
  'Social columns are returned only by the route for that user id, or when match_interest AND match_share both exist in both directions. Demo profiles get a placeholder instead of a link.';

do $rls$
declare
  tbl text;
begin
  foreach tbl in array array[
    'users',
    'artists',
    'artist_related',
    'user_artists',
    'shows',
    'show_rsvps',
    'match_interest',
    'match_share',
    'match_skip',
    'match_icebreaker',
    'search_cache'
  ]
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
