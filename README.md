# Kotoba Pocket

Kotoba Pocket is a production-quality MVP for Japanese learners collecting English words, idioms, phrases, phrasal verbs, and collocations. It is capture-first, local-first, private by default, and designed around short spaced-repetition sessions.

## Stack

- Expo + React Native + TypeScript
- Expo Router
- SQLite for offline-first local storage
- Supabase Auth, Postgres, Storage, and Edge Functions for sync and backup
- Zustand for local app state
- TanStack Query for server state and offline-friendly networking
- Zod validation
- FSRS-compatible scheduling module
- Native platform TTS via `expo-speech`

## Project Structure

```text
app/                         Expo Router screens
src/domain/                  TypeScript models and Zod schemas
src/data/local/              SQLite database, mappers, sync queue
src/data/repositories/       Local-first repositories
src/data/remote/             Supabase client and API calls
src/features/                Feature modules
src/ui/components/           Reusable UI components
supabase/migrations/         Postgres schema and RLS policies
tests/                       Unit and integration test skeletons
e2e/                         Detox E2E smoke tests
docs/                        Store and QA checklists
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Fill in:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

4. Start Expo:

```bash
npm run start
```

## Supabase Setup

1. Create a Supabase project.
2. Apply migrations:

```bash
supabase db push
```

3. Configure auth providers:

- Email magic link
- Apple Sign In
- Google Sign In

4. Create an optional private storage bucket for generated or uploaded pronunciation assets:

```text
pronunciation-assets
```

5. Deploy Edge Functions for:

- `POST /v1/sync/push`
- `GET /v1/sync/pull?since=<iso_timestamp>`
- Import/export endpoints
- Share link public read endpoint
- Account purge

The app already wraps these calls behind `src/data/remote/apiClient.ts`.
See `docs/api.md` for the full REST contract.

## Local-First Behavior

All writes go to SQLite first through repository functions. Each mutation then writes an ordered sync item to `sync_queue`. The sync worker:

1. Checks connectivity.
2. Uploads queued changes in order.
3. Removes accepted mutations.
4. Records rejected mutations.
5. Stores conflicts using field-level merge where safe, otherwise last-write-wins.

The app remains usable offline indefinitely.

## MVP Screens

- Home / Inbox
- Quick Add
- Card detail/edit
- Review session
- Collection
- Import/export
- Settings

The primary UI language is Japanese.

## Testing

```bash
npm run typecheck
npm run lint
npm test
```

Included unit coverage:

- FSRS scheduling transitions
- Answer normalization
- CSV parser validation
- Sync merge logic
- Review queue filtering

Integration and E2E specs are scaffolded as executable TODOs for the Supabase and device-backed flows.

## Deployment

1. Create Expo and Supabase projects.
2. Add SQL migrations and RLS policies.
3. Configure auth providers.
4. Configure optional storage bucket.
5. Set environment variables.
6. Run tests and lint.
7. Build preview app:

```bash
eas build --profile preview --platform all
```

8. Run manual QA from `docs/app-store-checklist.md`.
9. Build production binaries:

```bash
eas build --profile production --platform all
```

10. Prepare store metadata, privacy labels, and screenshots.
