-- Genres per show (ids from lib/genres.ts), for the genre filter on the Shows tab.
-- From Ticketmaster classifications, Songkick tags and the artist's scene tags;
-- filled by the shows import and backfilled by `npm run genres:shows`.

alter table shows add column if not exists genres text[] not null default '{}';
create index if not exists shows_genres_idx on shows using gin (genres);
