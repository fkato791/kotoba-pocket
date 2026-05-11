# API Contract

Base path for the Supabase Edge Function gateway:

```text
/functions/v1/api
```

## Auth

```http
POST /v1/auth/magic-link
POST /v1/auth/oauth/apple
POST /v1/auth/oauth/google
POST /v1/auth/logout
```

Mobile clients should prefer Supabase native SDK auth flows. The gateway keeps these routes reserved for clients that need a REST-compatible layer.

## Sync

```http
GET /v1/sync/pull?since=<iso_timestamp>
POST /v1/sync/push
```

Push body:

```json
{
  "device_id": "uuid",
  "changes": [
    {
      "client_change_id": "uuid",
      "entity": "deck",
      "op": "upsert",
      "client_updated_at": "2026-05-10T00:00:00.000Z",
      "payload": {}
    }
  ]
}
```

Push response:

```json
{
  "accepted": ["client_change_id"],
  "rejected": [],
  "conflicts": [],
  "cursor": "2026-05-10T00:00:00.000Z"
}
```

## Decks

```http
GET /v1/decks
POST /v1/decks
PATCH /v1/decks/:id
DELETE /v1/decks/:id
```

Decks are private by default.

## Cards

```http
GET /v1/cards?deck_id=&tag=&due_before=&difficult=&archived=&term_type=&q=
POST /v1/cards
PATCH /v1/cards/:id
DELETE /v1/cards/:id
```

Cards support words, idioms, phrases, phrasal verbs, and collocations.

## Reviews

```http
POST /v1/reviews
GET /v1/reviews?card_id=:id
```

Review ratings are `again`, `hard`, `good`, and `easy`.

## Import / Export

```http
POST /v1/import/csv
POST /v1/import/json
GET /v1/export/csv
GET /v1/export/json
```

CSV import validates rows before commit. JSON export is intended for full account backup.

## Share Links

```http
POST /v1/share-links
PATCH /v1/share-links/:id
DELETE /v1/share-links/:id
GET /public/share/:token
```

Share links are read-only, optional, expirable, and require explicit confirmation before creation.

## Privacy

```http
GET /v1/account/export
DELETE /v1/account
```

Account deletion must purge remote data owned by the authenticated user.
