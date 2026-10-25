-- Profiles can hold up to 50 artists (onboarding still asks for at most 5; more are added from
-- the Profile tab). The old rule only allowed positions 1 to 5.

alter table user_artists drop constraint if exists user_artists_position_check;
alter table user_artists add constraint user_artists_position_check check (position between 1 and 50);
