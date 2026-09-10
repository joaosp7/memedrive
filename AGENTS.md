<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MemeDrive

Local, read-only catalog of reference media in a private Cloudflare R2 bucket. Single route `/`. No login, upload, search, tags, or public bucket.

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest. Path alias `@/*` → repo root. No `src/` directory.

## Layout

| Path | Role |
|---|---|
| `app/page.tsx` | Server Component: load catalog, setup / section UI |
| `app/layout.tsx` | Fonts, metadata, cutting-mat body |
| `app/globals.css` | Theme tokens (`mat`, `kraft`, `pencil`, `ink`, `tape`) |
| `lib/r2/client.ts` | S3 client + `ListObjectsV2` / `GetObject` presign (`server-only`) |
| `lib/r2/catalog.ts` | Env check, pagination, per-key sign, `loadCatalog` |
| `lib/r2/media.ts` | Prefix/extension → kind, content-type, display name |
| `lib/r2/expires.ts` | Clamp `R2_SIGN_EXPIRES_SECONDS` to SigV4 1..604800 |
| `components/image-grid.tsx` | Client: square thumbnails + `<dialog>` lightbox |
| `components/video-grid.tsx` | Client: `#t=` poster frame + lightbox playback |
| `components/dialog-backdrop.ts` | Backdrop click = target is the `<dialog>` itself |

`docs/superpowers/` is historical. Prefer the code and this file when they disagree.

## Data flow

1. `HomePage` is `force-dynamic`. It calls `loadCatalog(process.env, createR2Store(process.env))`.
2. Missing required env → setup UI (HTTP 200), list the blank names. Do not throw.
3. Otherwise list `images/`, `videos/`, `audios/` in parallel (`Prefix` only, no delimiter). Follow `NextContinuationToken`. Drop keys that end in `/`.
4. Presign each remaining key. A single sign failure omits that item; a list/API failure is an inline section error — other sections still render.
5. Browser only ever sees short-lived signed GET URLs. R2 credentials stay on the server.

Kind is the object prefix. Extension is fallback only. Display name is the key with that prefix stripped.

Video grid posters use `videoThumbnailUrl` (`#t=0.1`). The fragment is client-only and must not be sent to R2 (it would break the signature).

## Invariants

- One private bucket. No public ACL, custom domain, or Next.js media proxy.
- `createR2Store` is the only AWS SDK call site. Inject `CatalogStore` into `loadCatalog` so tests never touch the network.
- Native `<img>`, `<audio>`, `<video>`, and `<dialog>`. Do not use `next/image` (signed R2 hosts are not in `images.remotePatterns`).
- No new UI libraries. Lightbox selection is client state only (no query/hash).
- Keep the cutting-mat palette and type: `font-display` / `font-body` / `font-label`. Do not invent tokens.
- Colocate unit tests next to the module (`*.test.ts`). Vitest `environment: "node"`. No live R2 in CI; do not assert real signed URLs.

## Commands

```bash
npm run dev    # http://localhost:3000
npm test       # vitest run
npm run lint
npm run build
```

Copy `.env.example` to `.env.local`. Required: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Optional: `R2_SIGN_EXPIRES_SECONDS` (default 3600).

Stop any `next dev` / app servers **you** started once the task is done. Leave processes the user already had running.
