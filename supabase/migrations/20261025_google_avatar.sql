-- Profile picture from the Google account a profile signed in with (refreshed on each Google sign-in).

alter table users add column if not exists avatar_url text;
