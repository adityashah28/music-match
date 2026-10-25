-- Phone auth + richer profile for matching.

alter table users add column if not exists name text;
alter table users add column if not exists phone text;
alter table users add column if not exists age integer;
alter table users add column if not exists age_min integer;
alter table users add column if not exists age_max integer;
alter table users add column if not exists city_lat double precision;
alter table users add column if not exists city_lng double precision;
alter table users add column if not exists city_place_id text;

create unique index if not exists users_phone_key on users (phone) where phone is not null;

alter table users drop constraint if exists users_age_check;
alter table users add constraint users_age_check
  check (age is null or (age >= 18 and age <= 99));

alter table users drop constraint if exists users_age_range_check;
alter table users add constraint users_age_range_check
  check (
    age_min is null
    or age_max is null
    or (age_min >= 18 and age_max <= 99 and age_min <= age_max)
  );

create table if not exists phone_otps (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.phone_otps enable row level security;

do $otp_rls$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.phone_otps from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table public.phone_otps from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on table public.phone_otps to service_role;
  end if;
end
$otp_rls$;
