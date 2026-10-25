-- Show coordinates (from the show's city), so the Shows list can sort by distance from the viewer.
-- Filled by the shows import (lib/shows-import.ts) and backfilled by `npm run geocode:shows`.

alter table shows add column if not exists lat double precision;
alter table shows add column if not exists lng double precision;
