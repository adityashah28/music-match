-- Usernames are unique, ignoring capitals ("Maya" and "maya" are the same username).
-- The app checks first and shows "That username is taken"; this is the backstop for two
-- people signing up with the same name at the same moment.

create unique index if not exists users_handle_lower_key on users (lower(handle)) where handle is not null and handle <> '';
