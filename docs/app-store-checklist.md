# App Store Submission Checklist

## Product
- Japanese screenshots for Home, Quick Add, Review, Collection, Import/Export, and Settings.
- App name, subtitle, keywords, and description prepared in Japanese.
- Support URL and privacy policy URL available.

## Privacy
- Declare account email as optional account data.
- Declare learning cards as user content, private by default.
- Analytics provider remains disabled unless explicitly enabled.
- No public search index.
- Account deletion and data export paths verified.

## QA
- Offline add and review verified after app restart.
- Magic link, Apple Sign In, and Google Sign In verified.
- Sync from first device to second device verified.
- CSV and JSON export files validated.
- Dynamic text, screen reader labels, dark mode, high contrast, and reduced motion smoke tested.

## Builds
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `eas build --profile preview --platform all`
- `eas build --profile production --platform ios`
- `eas build --profile production --platform android`
