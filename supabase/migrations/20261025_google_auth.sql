-- Google sign-in (Supabase Auth). A profile is linked to the Supabase Auth user that proved
-- ownership of a Google account; phone becomes optional, since Google users may never add one.

alter table users add column if not exists auth_user_id uuid;
alter table users add column if not exists email text;

create unique index if not exists users_auth_user_id_key on users (auth_user_id) where auth_user_id is not null;
