# MEHFIL community persistence: fresh Supabase start

## Chosen cutover strategy

Start the Community Baithak fresh in Supabase. Do not export or import the
existing Render community messages. The old community history will not appear
in the new Supabase-backed community.

Keep the existing Render deployment untouched until the new code and Supabase
configuration are ready. Do not add the Supabase environment variables or
redeploy as part of preparation.

## What moves to Supabase

When both server environment variables are configured, these community
operations use Supabase:

- Read the latest community messages
- Create messages
- Edit and delete messages (owner-only)
- Like messages

The existing API routes and Socket.IO event names remain unchanged. Public
responses use camelCase fields and never expose ownerId.

## What stays on the existing Render database

Songs, song requests, favorites, playlists and listening history continue using
the existing SQLite/JSON database layer. They are not migrated by this change.

Important: the current Render Free database defaults to a temporary filesystem
path when DB_PATH is unset. Render restarts, spin-downs and redeploys can erase
that local data. A deployment for the Supabase cutover can therefore also
reset local data outside Community Baithak. Curated seed data may be recreated,
but user-generated local data should not be assumed to survive.

## Supabase setup

1. Apply `supabase/community_schema.sql` in the Supabase SQL Editor. It creates
   the server-only table, index and atomic like RPC. RLS is enabled without
   browser access policies.
2. In the Render service's Environment settings, add:
   - `SUPABASE_URL`: the Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the server-side service-role secret.
3. Never put the service-role key in Netlify, frontend code, GitHub, or chat.
4. Only after reviewing the deployment impact, deploy the branch containing
   this integration. Adding both variables makes community traffic switch to
   Supabase as soon as that server version starts.
5. Verify community reads, posting, editing, deleting, likes and live socket
   updates. Confirm that new messages remain after a backend restart.

If either variable is missing while the other is present, the server fails
fast. If both are absent, the existing local community store remains active.
When Supabase is configured, failures return an error; the API does not
silently fall back to local SQLite.

## Operational notes

- Supabase calls have a 10-second timeout.
- The backend uses the service-role key only on the server.
- The application currently loads the latest 40 community messages.
- This is a fresh community start; no historic Render messages are copied.
