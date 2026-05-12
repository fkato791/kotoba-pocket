# Supabase Setup

## 1. Create Project

1. Open Supabase.
2. Create a new project.
3. Copy these values from Project Settings > API:
   - Project URL
   - anon public key

## 2. Create `.env`

Create `.env` in the project root:

```env
APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Restart Expo after changing `.env`.

## 3. Apply SQL Migrations

In Supabase SQL Editor, run these files in order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`
3. `supabase/migrations/0003_storage.sql`
4. `supabase/migrations/0004_card_images.sql`

## 4. Configure Auth

Enable Email auth first:

1. Authentication > Providers
2. Enable Email
3. Enable Magic Link / OTP

For local MVP testing, Apple and Google can wait until the native preview build stage.

## 5. Deploy Edge Function

Install Supabase CLI, then:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy api
```

The app calls:

```text
https://your-project.supabase.co/functions/v1/api
```

## 6. Verify

1. Start the app.
2. Open Settings.
3. Enter your email.
4. Tap magic link send.
5. Confirm the email arrives.

Sync push/pull requires sign-in and the Edge Function deployment.
