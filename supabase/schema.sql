-- Music Match schema. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it only creates things that don't exist yet.

-- People who signed up (real hackers + seeded demo profiles)
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null default gen_random_uuid(),  -- secret, kept in the user's localStorage, proves "I am this user"
  handle      text not null check (char_length(handle) between 1 and 30),
  city        text not null,
  instagram   text,
  tiktok      text,
  snapchat    text,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);
-- Handles are unique ignoring case ("Aditya" and "aditya" clash)
create unique index if not exists users_handle_lower_idx on users (lower(handle));

-- Every artist we know about (from search, seeding, or shows)
create table if not exists artists (
  id                  bigint generated always as identity primary key,
  name                text not null,
  normalized_name     text not null unique,   -- lowercase, punctuation stripped: "phoebe bridgers"
  deezer_id           bigint unique,
  spotify_id          text unique,
  image_url           text,
  dominant_color_hex  text,                   -- e.g. "#3a5f8c", computed once from image_url
  fan_count           integer,                -- Deezer nb_fan
  monthly_listeners   integer,                -- from Apify, if we get it
  genres              text[] not null default '{}',
  source              text not null default 'deezer',
  related_fetched_at  timestamptz,            -- null means we haven't pulled related artists yet
  updated_at          timestamptz not null default now()
);

-- "Artist A sounds like artist B" (used for neighbor credit in matching)
create table if not exists artist_related (
  artist_id          bigint not null references artists (id) on delete cascade,
  related_artist_id  bigint not null references artists (id) on delete cascade,
  rank               smallint not null,       -- 1 = most similar
  primary key (artist_id, related_artist_id),
  check (artist_id <> related_artist_id)
);

-- Each user's top 5 artists
create table if not exists user_artists (
  user_id    uuid   not null references users (id) on delete cascade,
  artist_id  bigint not null references artists (id) on delete cascade,
  position   smallint not null check (position between 1 and 5),
  primary key (user_id, artist_id),
  unique (user_id, position)
);
create index if not exists user_artists_artist_idx on user_artists (artist_id);

-- Upcoming concerts (from Apify and Ticketmaster)
create table if not exists shows (
  id                      bigint generated always as identity primary key,
  source                  text not null,      -- 'bandsintown' | 'songkick' | 'ticketmaster'
  source_id               text not null,      -- the event's id in that source, so re-imports update instead of duplicating
  artist_name             text not null,
  normalized_artist_name  text not null,
  artist_id               bigint references artists (id) on delete set null,
  venue                   text,
  city                    text,
  starts_at               timestamptz,
  ticket_url              text,
  image_url               text,
  updated_at              timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists shows_artist_idx on shows (normalized_artist_name);
create index if not exists shows_city_time_idx on shows (city, starts_at);

-- Going / maybe / not going
create table if not exists show_rsvps (
  user_id     uuid   not null references users (id) on delete cascade,
  show_id     bigint not null references shows (id) on delete cascade,
  status      text   not null check (status in ('going', 'maybe', 'not_going')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, show_id)
);
create index if not exists show_rsvps_show_idx on show_rsvps (show_id);

-- "I'm interested" taps. Socials unlock only when rows exist in BOTH directions.
create table if not exists match_interest (
  user_id        uuid not null references users (id) on delete cascade,
  other_user_id  uuid not null references users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, other_user_id),
  check (user_id <> other_user_id)
);
create index if not exists match_interest_other_idx on match_interest (other_user_id);

-- Lock every table. With RLS on and no policies, the public (anon) key can read nothing.
-- Only our API routes, using the secret service key, can read or write.
alter table users          enable row level security;
alter table artists        enable row level security;
alter table artist_related enable row level security;
alter table user_artists   enable row level security;
alter table shows          enable row level security;
alter table show_rsvps     enable row level security;
alter table match_interest enable row level security;
