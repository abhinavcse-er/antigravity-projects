# MEHFIL community persistence migration

## Current state
The application currently stores community messages in SQLite (or a JSON fallback).
On Render Free, the default database path is under the temporary filesystem, so
messages are not guaranteed to survive restarts/redeploys.

## Target
Supabase PostgreSQL, accessed only by the Node/Express server. The browser must
continue using the existing `/api/community` endpoints and Socket.IO events.
Never expose the Supabase service-role key to the client or commit it to Git.

## Safe migration sequence
1. Keep the current Render service running. Do not change `DB_PATH` or remove its disk.
2. Export the current SQLite database from the live Render instance (including
   `community_messages`, likes, owner IDs, edit timestamps). Store a protected backup.
3. Create a Supabase project and apply `supabase/community_schema.sql`.
4. Configure server-only environment variables in Render:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   Use Render's secret environment-variable UI; do not send credentials in chat.
5. Implement and test the PostgreSQL repository behind the existing API. Preserve
   the current response shape: `userName`, `userAvatar`, `mood`, `text`,
   `isShayari`, `likes`, `timestamp`, `ownerId`, `editedAt`.
6. Import the exported records with original IDs and timestamps. Verify row counts,
   ordering, edit/delete ownership and likes before switching reads/writes.
7. Run a short dual-check/maintenance window, then switch the API to PostgreSQL.
   Keep the SQLite export until the new deployment has been verified.

## Important
This SQL is only the destination schema. It does not itself migrate existing
messages or change the running app. The repository's database API is synchronous
today, while network database access is asynchronous; the repository/routes need
a deliberate async refactor before switching production traffic.
