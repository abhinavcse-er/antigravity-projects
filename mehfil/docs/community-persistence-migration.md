# MEHFIL community persistence migration

## Current implementation
The Express API now has an optional Supabase-backed community repository. When
both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present, community reads,
posts, edits, deletes and likes use Supabase. If both are absent, local SQLite /
JSON storage remains active for development. If only one variable is present,
the server fails fast rather than silently writing to the wrong database.

All other MEHFIL data (songs, requests, favorites, playlists and listening
history) remains on the existing database layer. The service-role key is used
only by the server-side adapter and must never be placed in client code.

## Deploy sequence
1. Keep the current Render service and its database/disk intact.
2. Export the live community_messages data from the current Render database
   before enabling Supabase. Preserve IDs, owner IDs, likes, timestamps and
   edited timestamps.
3. Apply supabase/community_schema.sql in the Supabase SQL Editor. It creates
   the table, index and atomic like RPC. RLS is enabled with no browser policies.
4. In Render Environment settings, add SUPABASE_URL and
   SUPABASE_SERVICE_ROLE_KEY as secret environment variables. Never commit or
   paste the service-role key into GitHub, source code, or chat.
5. Import exported rows into public.community_messages with original IDs.
   After explicit-ID import, advance the identity sequence using:
   select setval(pg_get_serial_sequence('public.community_messages', 'id'),
   coalesce((select max(id) from public.community_messages), 1),
   exists(select 1 from public.community_messages));
6. Verify row counts, message ordering, owner-only edit/delete, likes, and a
   restart/redeploy before treating the migration as complete.
7. Keep the protected SQLite export until production verification is complete.

## API behaviour
- Existing /api/community routes and Socket.IO event names are unchanged.
- Public responses still use camelCase fields and never expose ownerId.
- Supabase network calls are asynchronous and have a 10-second timeout.
- Likes use a PostgreSQL update function to avoid lost increments under concurrency.
- The server returns a temporary-unavailable response on Supabase read failure;
  it does not silently fall back to SQLite when Supabase is configured.

## Important
Adding the environment variables switches community traffic to Supabase
immediately after deployment. Do not enable them until the current Render
messages have been exported and imported. This code does not automatically
copy existing Render data; data migration is a separate verified step.
