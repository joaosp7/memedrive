# MemeDrive scaffold — catalog from Cloudflare R2

Date: 2026-09-06  
Status: draft for review

## Purpose

MemeDrive is a local, read-only web catalog of reference images and audio stored in Cloudflare R2. Files are for quick lookup, not high-quality display. This first slice is a Next.js app in this directory with a single page that lists and plays media from R2.

## Constraints (agreed)

- One R2 bucket with two prefixes: `images/` and `audios/`
- Bucket stays private
- Next.js server lists objects via the S3-compatible API and the page loads media via short-lived signed URLs
- No login (local / not publicly shared)
- No upload UI, tags, folders, or search in this slice

## Architecture

Next.js App Router, TypeScript, and Tailwind CSS, scaffolded in the repo root.

A **server-only** R2 client uses `@aws-sdk/client-s3` (and `getSignedUrl` from `@aws-sdk/s3-request-presigner`) against the R2 S3 endpoint:

`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`

The home page is a Server Component. It asks the catalog module for two lists (images, audios), each item `{ key, contentType, url }`, and renders them. Clients never receive R2 credentials.

### Environment

| Variable | Required | Notes |
|---|---|---|
| `R2_ACCOUNT_ID` | yes | Used to build the endpoint |
| `R2_ACCESS_KEY_ID` | yes | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | yes | R2 API token secret |
| `R2_BUCKET_NAME` | yes | Single bucket |
| `R2_SIGN_EXPIRES_SECONDS` | no | Default `3600` (1 hour) |

Document these in `.env.example`. Runtime reads `.env.local`.

### Out of scope

Auth, uploads, public bucket / custom domain, Next.js media proxy, pagination UI, search, tagging, full-resolution viewers.

## Catalog page

Single route: `/`.

- **Images** — dense thumbnail grid. `<img>` uses the signed URL. Reference quality only: no lightbox, no original-size viewer.
- **Audios** — list of filename plus native `<audio controls>`.
- Each item labels the object key (filename after the prefix).
- Empty prefix: short empty state (“No images in `images/`” / “No audios in `audios/`”).
- Missing required env: setup message listing which variables to set, not a crash.

No other routes in this slice besides Next.js defaults.

## Data flow

1. Server reads env. If required vars are missing, skip R2 and render the setup message.
2. List `images/` and `audios/` with `ListObjectsV2` using `Prefix` only (no delimiter), so nested keys under those prefixes still appear. Ignore keys that end in `/` (folder placeholders).
3. Infer media kind from prefix (`images/` → image, `audios/` → audio). Extension is a fallback if a key is ever listed without a matching prefix.
4. For each remaining key, `GetObject` presign with `R2_SIGN_EXPIRES_SECONDS`.
5. Guess `contentType` from extension (e.g. `.png` → `image/png`, `.mp3` → `audio/mpeg`). Unknown extensions still appear; the browser tag may fail to render them.
6. Page renders the two sections independently.

Listing is not paginated in this slice. If a prefix has more objects than a single `ListObjectsV2` page, follow `NextContinuationToken` until the prefix is fully listed (correctness over UI pagination).

## Error handling

- Missing env → setup UI, HTTP 200.
- One prefix fails (network, credentials, NoSuchBucket, access denied) → that section shows an inline error; the other section still renders if it succeeded.
- Signed URL generation failure for a single key → omit that item and continue; do not fail the whole section unless listing itself failed.
- Expired signed URLs: refresh the page to mint new ones. No client-side refresh job in this slice.

## Testing

No live R2 in CI.

- Unit: prefix/extension → kind + contentType.
- Unit: S3-like list payload (keys including folder placeholders and mixed prefixes) → catalog items (placeholders dropped, keys preserved).

Do not assert against real signed URLs or network.

## File sketch

```
app/page.tsx                  # catalog page
app/layout.tsx
lib/r2/client.ts              # S3 client (server-only)
lib/r2/catalog.ts             # list + sign
lib/r2/media.ts               # kind + contentType from key
```

The repo already contains this spec under `docs/`. Scaffold Next.js in place (dot directory) without deleting that tree.

## Success criteria

- Next.js runs from this directory (`npm run dev` / `npm run build`).
- With valid `.env.local`, `/` shows objects under `images/` as thumbnails and `audios/` as playable audio.
- With env missing, `/` explains how to configure R2.
- Bucket remains private; only signed GET URLs are exposed to the browser.
