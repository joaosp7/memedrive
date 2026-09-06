# MemeDrive Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js app in this repo whose home page lists private R2 objects under `images/` and `audios/` and loads them via short-lived signed URLs.

**Architecture:** App Router Server Component on `/` calls `loadCatalog`. A server-only S3 client talks to Cloudflare R2. Pure functions (`media.ts`, key/list mapping in `catalog.ts`) are unit-tested without network. The AWS SDK is used only in `client.ts` and is injected into `loadCatalog` so tests never call R2.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Vitest, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `server-only`

## Global Constraints

- One R2 bucket with two prefixes: `images/` and `audios/`
- Bucket stays private; browser only receives signed GET URLs
- Next.js server lists objects via the S3-compatible API
- No login, upload UI, tags, folders, search, lightbox, or media proxy
- Required env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- Optional env: `R2_SIGN_EXPIRES_SECONDS` default `3600`
- R2 endpoint: `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
- List with `Prefix` only (no delimiter); follow `NextContinuationToken` until exhausted
- Ignore keys that end in `/`
- No live R2 in CI; do not assert real signed URLs or network
- Scaffold in this directory without deleting `docs/`
- Home page uses `<img>` and `<audio controls>`, not `next/image`
- Empty copy: `No images in images/` and `No audios in audios/`
- Missing env → setup UI, HTTP 200; one prefix failure does not fail the other

## File map

| File | Responsibility |
|---|---|
| `lib/r2/media.ts` | Kind, content-type, display name from object key |
| `lib/r2/catalog.ts` | Env check, S3 list mapping, per-key sign, `loadCatalog` |
| `lib/r2/client.ts` | S3 client, `ListObjectsV2` pages, `GetObject` presign |
| `lib/r2/media.test.ts` | Kind + content-type tests |
| `lib/r2/catalog.test.ts` | List mapping + `loadCatalog` with fake store |
| `app/page.tsx` | Catalog UI |
| `app/layout.tsx` | Root layout (from create-next-app, title/copy only) |
| `.env.example` | Env documentation |
| `vitest.config.ts` | Node test runner + `@/` alias |

---

### Task 1: Scaffold Next.js + Vitest

**Files:**
- Create: Next.js app files from `create-next-app` (do not hand-roll the framework)
- Create: `vitest.config.ts`
- Create: `.env.example`
- Modify: `package.json` (add `test` script and vitest)
- Preserve: `docs/` (spec + this plan)

**Interfaces:**
- Consumes: empty git repo except `docs/` and `.git`
- Produces: runnable Next.js app at repo root with `app/` (no `src/`), `npm test` via Vitest, `.env.example` listing the five R2 variables

- [ ] **Step 1: Preserve docs, then scaffold**

The directory is not empty (`docs/`). `create-next-app` refuses conflicting files. Move docs out, scaffold, move docs back.

```bash
cd /Users/joaolucas/Developer/MemeDrive
mv docs /tmp/memedrive-docs
npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --empty --import-alias "@/*" --use-npm --yes --disable-git --no-react-compiler
mv /tmp/memedrive-docs docs
```

Expected: `package.json`, `app/layout.tsx`, `app/page.tsx`, `tsconfig.json` exist; `docs/superpowers/specs/2026-09-06-memedrive-scaffold-design.md` still exists.

If create-next-app errors because `.git` counts as conflict, pass nothing else — `.git` is allowed. If it errors on other files, stop and report the exact error.

- [ ] **Step 2: Add Vitest**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
```

In `package.json` scripts, set:

```json
"test": "vitest run"
```

Leave existing `dev`, `build`, `start`, `lint` scripts unchanged.

- [ ] **Step 3: Write `.env.example`**

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_SIGN_EXPIRES_SECONDS=3600
```

Do not create `.env.local`. Do not commit secrets.

- [ ] **Step 4: Verify scaffold**

```bash
npm test
npm run build
```

Expected: Vitest passes with 0 tests (or “No test files found” is acceptable only if the command exits 0; if Vitest exits non-zero with no tests, add `lib/r2/media.test.ts` in Task 2 before worrying — Task 1 only requires `npm run build` to succeed). `next build` succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold Next.js app with Vitest

EOF
)"
```

---

### Task 2: Media kind and content type

**Files:**
- Create: `lib/r2/media.ts`
- Test: `lib/r2/media.test.ts`

**Interfaces:**
- Consumes: object keys as strings
- Produces:
  - `export type MediaKind = "image" | "audio" | "unknown"`
  - `export function mediaKindFromKey(key: string): MediaKind`
  - `export function contentTypeFromKey(key: string): string`
  - `export function displayNameFromKey(key: string): string`

- [ ] **Step 1: Write the failing test**

Create `lib/r2/media.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  contentTypeFromKey,
  displayNameFromKey,
  mediaKindFromKey,
} from "./media";

describe("mediaKindFromKey", () => {
  it("uses images/ prefix", () => {
    expect(mediaKindFromKey("images/cat.png")).toBe("image");
  });

  it("uses audios/ prefix", () => {
    expect(mediaKindFromKey("audios/bruh.mp3")).toBe("audio");
  });

  it("falls back to extension when prefix is missing", () => {
    expect(mediaKindFromKey("cat.webp")).toBe("image");
    expect(mediaKindFromKey("bruh.wav")).toBe("audio");
  });

  it("returns unknown when prefix and extension do not match", () => {
    expect(mediaKindFromKey("notes/todo.txt")).toBe("unknown");
  });
});

describe("contentTypeFromKey", () => {
  it("maps common image extensions", () => {
    expect(contentTypeFromKey("images/a.png")).toBe("image/png");
    expect(contentTypeFromKey("images/a.jpg")).toBe("image/jpeg");
    expect(contentTypeFromKey("images/a.jpeg")).toBe("image/jpeg");
    expect(contentTypeFromKey("images/a.gif")).toBe("image/gif");
    expect(contentTypeFromKey("images/a.webp")).toBe("image/webp");
  });

  it("maps common audio extensions", () => {
    expect(contentTypeFromKey("audios/a.mp3")).toBe("audio/mpeg");
    expect(contentTypeFromKey("audios/a.wav")).toBe("audio/wav");
    expect(contentTypeFromKey("audios/a.ogg")).toBe("audio/ogg");
    expect(contentTypeFromKey("audios/a.m4a")).toBe("audio/mp4");
  });

  it("returns application/octet-stream for unknown extensions", () => {
    expect(contentTypeFromKey("images/file.unknown")).toBe(
      "application/octet-stream",
    );
  });
});

describe("displayNameFromKey", () => {
  it("strips the images/ prefix including nested keys", () => {
    expect(displayNameFromKey("images/memes/cat.png")).toBe("memes/cat.png");
  });

  it("strips the audios/ prefix", () => {
    expect(displayNameFromKey("audios/bruh.mp3")).toBe("bruh.mp3");
  });

  it("returns the key when no known prefix is present", () => {
    expect(displayNameFromKey("loose.png")).toBe("loose.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/r2/media.test.ts
```

Expected: FAIL because `./media` cannot be resolved.

- [ ] **Step 3: Write minimal implementation**

Create `lib/r2/media.ts`:

```ts
export type MediaKind = "image" | "audio" | "unknown";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"]);
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac", "oga"]);

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
};

function extensionOf(key: string): string {
  const base = key.split("/").pop() ?? key;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function mediaKindFromKey(key: string): MediaKind {
  if (key.startsWith("images/")) return "image";
  if (key.startsWith("audios/")) return "audio";
  const ext = extensionOf(key);
  if (IMAGE_EXT.has(ext)) return "image";
  if (AUDIO_EXT.has(ext)) return "audio";
  return "unknown";
}

export function contentTypeFromKey(key: string): string {
  return CONTENT_TYPES[extensionOf(key)] ?? "application/octet-stream";
}

export function displayNameFromKey(key: string): string {
  if (key.startsWith("images/")) return key.slice("images/".length);
  if (key.startsWith("audios/")) return key.slice("audios/".length);
  return key;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/r2/media.test.ts
```

Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/r2/media.ts lib/r2/media.test.ts
git commit -m "$(cat <<'EOF'
feat: classify R2 object keys as image or audio

EOF
)"
```

---

### Task 3: Catalog mapping and loadCatalog

**Files:**
- Create: `lib/r2/catalog.ts`
- Test: `lib/r2/catalog.test.ts`

**Interfaces:**
- Consumes: `contentTypeFromKey`, `displayNameFromKey` from `lib/r2/media.ts`
- Produces:
  - `export const IMAGE_PREFIX = "images/"`
  - `export const AUDIO_PREFIX = "audios/"`
  - `export const REQUIRED_R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"] as const`
  - `export type CatalogItem = { key: string; contentType: string; url: string; displayName: string }`
  - `export type CatalogSection = { status: "ok"; items: CatalogItem[] } | { status: "error"; message: string }`
  - `export type Catalog = { configured: boolean; missingEnv: string[]; images: CatalogSection; audios: CatalogSection }`
  - `export type CatalogStore = { listKeys: (prefix: string) => Promise<string[]>; signUrl: (key: string) => Promise<string> }`
  - `export function missingR2Env(env: Record<string, string | undefined>): string[]`
  - `export function keysFromContents(contents: Array<{ Key?: string }> | undefined): string[]`
  - `export async function listAllKeys(fetchPage: (continuationToken?: string) => Promise<{ contents?: Array<{ Key?: string }>; nextContinuationToken?: string }>): Promise<string[]>`
  - `export async function itemsFromKeys(keys: string[], signUrl: (key: string) => Promise<string>): Promise<CatalogItem[]>`
  - `export async function loadCatalog(env: Record<string, string | undefined>, store: CatalogStore): Promise<Catalog>`

- [ ] **Step 1: Write the failing test**

Create `lib/r2/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  itemsFromKeys,
  keysFromContents,
  listAllKeys,
  loadCatalog,
  missingR2Env,
  type CatalogStore,
} from "./catalog";

const configuredEnv = {
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "memes",
};

describe("missingR2Env", () => {
  it("lists every required variable that is blank", () => {
    expect(missingR2Env({})).toEqual([
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ]);
  });

  it("returns empty when all required variables are set", () => {
    expect(missingR2Env(configuredEnv)).toEqual([]);
  });
});

describe("keysFromContents", () => {
  it("drops folder placeholders and missing keys", () => {
    expect(
      keysFromContents([
        { Key: "images/" },
        { Key: "images/cat.png" },
        { Key: "images/nested/" },
        { Key: "images/nested/dog.gif" },
        {},
      ]),
    ).toEqual(["images/cat.png", "images/nested/dog.gif"]);
  });

  it("returns empty for undefined contents", () => {
    expect(keysFromContents(undefined)).toEqual([]);
  });
});

describe("listAllKeys", () => {
  it("follows continuation tokens until exhausted", async () => {
    const pages = new Map<string | undefined, {
      contents?: Array<{ Key?: string }>;
      nextContinuationToken?: string;
    }>([
      [undefined, { contents: [{ Key: "images/a.png" }], nextContinuationToken: "n1" }],
      ["n1", { contents: [{ Key: "images/" }, { Key: "images/b.png" }] }],
    ]);

    const keys = await listAllKeys(async (token) => pages.get(token) ?? {});
    expect(keys).toEqual(["images/a.png", "images/b.png"]);
  });
});

describe("itemsFromKeys", () => {
  it("preserves keys and omits sign failures", async () => {
    const items = await itemsFromKeys(
      ["images/cat.png", "images/nope.png"],
      async (key) => {
        if (key.includes("nope")) throw new Error("sign failed");
        return `https://signed.example/${key}`;
      },
    );
    expect(items).toEqual([
      {
        key: "images/cat.png",
        contentType: "image/png",
        url: "https://signed.example/images/cat.png",
        displayName: "cat.png",
      },
    ]);
  });
});

describe("loadCatalog", () => {
  it("skips the store when env is missing", async () => {
    const catalog = await loadCatalog({}, {
      listKeys: async () => {
        throw new Error("should not list");
      },
      signUrl: async () => {
        throw new Error("should not sign");
      },
    });
    expect(catalog.configured).toBe(false);
    expect(catalog.missingEnv).toContain("R2_ACCOUNT_ID");
    expect(catalog.images).toEqual({ status: "ok", items: [] });
    expect(catalog.audios).toEqual({ status: "ok", items: [] });
  });

  it("keeps the other section when one prefix fails", async () => {
    const store: CatalogStore = {
      listKeys: async (prefix) => {
        if (prefix === "audios/") throw new Error("NoSuchBucket");
        return ["images/cat.png"];
      },
      signUrl: async (key) => `https://signed.example/${key}`,
    };
    const catalog = await loadCatalog(configuredEnv, store);
    expect(catalog.configured).toBe(true);
    expect(catalog.images.status).toBe("ok");
    if (catalog.images.status === "ok") {
      expect(catalog.images.items).toHaveLength(1);
      expect(catalog.images.items[0]?.key).toBe("images/cat.png");
    }
    expect(catalog.audios).toEqual({
      status: "error",
      message: "NoSuchBucket",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/r2/catalog.test.ts
```

Expected: FAIL because `./catalog` cannot be resolved.

- [ ] **Step 3: Write minimal implementation**

Create `lib/r2/catalog.ts`:

```ts
import { contentTypeFromKey, displayNameFromKey } from "./media";

export const IMAGE_PREFIX = "images/";
export const AUDIO_PREFIX = "audios/";

export const REQUIRED_R2_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

export type CatalogItem = {
  key: string;
  contentType: string;
  url: string;
  displayName: string;
};

export type CatalogSection =
  | { status: "ok"; items: CatalogItem[] }
  | { status: "error"; message: string };

export type Catalog = {
  configured: boolean;
  missingEnv: string[];
  images: CatalogSection;
  audios: CatalogSection;
};

export type CatalogStore = {
  listKeys: (prefix: string) => Promise<string[]>;
  signUrl: (key: string) => Promise<string>;
};

export function missingR2Env(
  env: Record<string, string | undefined>,
): string[] {
  return REQUIRED_R2_ENV.filter((name) => !env[name]?.trim());
}

export function keysFromContents(
  contents: Array<{ Key?: string }> | undefined,
): string[] {
  if (!contents) return [];
  return contents
    .map((entry) => entry.Key)
    .filter((key): key is string => Boolean(key) && !key.endsWith("/"));
}

export async function listAllKeys(
  fetchPage: (
    continuationToken?: string,
  ) => Promise<{
    contents?: Array<{ Key?: string }>;
    nextContinuationToken?: string;
  }>,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await fetchPage(continuationToken);
    keys.push(...keysFromContents(page.contents));
    continuationToken = page.nextContinuationToken;
  } while (continuationToken);
  return keys;
}

export async function itemsFromKeys(
  keys: string[],
  signUrl: (key: string) => Promise<string>,
): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  for (const key of keys) {
    try {
      const url = await signUrl(key);
      items.push({
        key,
        contentType: contentTypeFromKey(key),
        url,
        displayName: displayNameFromKey(key),
      });
    } catch {
      // omit keys that cannot be signed
    }
  }
  return items;
}

async function loadSection(
  prefix: string,
  store: CatalogStore,
): Promise<CatalogSection> {
  try {
    const keys = await store.listKeys(prefix);
    const items = await itemsFromKeys(keys, store.signUrl);
    return { status: "ok", items };
  } catch (error) {
    const message = error instanceof Error ? error.message : "R2 request failed";
    return { status: "error", message };
  }
}

export async function loadCatalog(
  env: Record<string, string | undefined>,
  store: CatalogStore,
): Promise<Catalog> {
  const missingEnv = missingR2Env(env);
  if (missingEnv.length > 0) {
    return {
      configured: false,
      missingEnv,
      images: { status: "ok", items: [] },
      audios: { status: "ok", items: [] },
    };
  }

  const [images, audios] = await Promise.all([
    loadSection(IMAGE_PREFIX, store),
    loadSection(AUDIO_PREFIX, store),
  ]);

  return { configured: true, missingEnv: [], images, audios };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/r2/catalog.test.ts lib/r2/media.test.ts
```

Expected: PASS (all tests in both files).

- [ ] **Step 5: Commit**

```bash
git add lib/r2/catalog.ts lib/r2/catalog.test.ts
git commit -m "$(cat <<'EOF'
feat: map R2 listings into catalog sections

EOF
)"
```

---

### Task 4: R2 S3 client

**Files:**
- Create: `lib/r2/client.ts`
- Modify: `package.json` (AWS SDK deps)

**Interfaces:**
- Consumes: `CatalogStore`, `listAllKeys` from `lib/r2/catalog.ts`
- Produces:
  - `export function createR2Store(env: Record<string, string | undefined>): CatalogStore`
  - `listKeys(prefix)` uses `ListObjectsV2` with `Prefix` only (no `Delimiter`), paginated via `listAllKeys`
  - `signUrl(key)` uses `GetObject` + `getSignedUrl`
  - File starts with `import "server-only"`
  - Expires: `Number(env.R2_SIGN_EXPIRES_SECONDS) || 3600`
  - Client region `"auto"`, endpoint `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

No unit tests that call the network. Coverage for listing/signing behavior is the injected-store tests in Task 3.

- [ ] **Step 1: Install AWS SDK packages**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner server-only
```

- [ ] **Step 2: Implement the client**

Create `lib/r2/client.ts`:

```ts
import "server-only";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { listAllKeys, type CatalogStore } from "./catalog";

export function createR2Store(
  env: Record<string, string | undefined>,
): CatalogStore {
  const accountId = env.R2_ACCOUNT_ID ?? "";
  const bucket = env.R2_BUCKET_NAME ?? "";
  const expiresIn = Number(env.R2_SIGN_EXPIRES_SECONDS) || 3600;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  return {
    async listKeys(prefix: string) {
      return listAllKeys(async (continuationToken) => {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        return {
          contents: response.Contents,
          nextContinuationToken: response.NextContinuationToken,
        };
      });
    },
    async signUrl(key: string) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn },
      );
    },
  };
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS (no errors). If `tsc` is not configured for the app, `npm run build` is the fallback and must succeed.

- [ ] **Step 4: Commit**

```bash
git add lib/r2/client.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: list and sign R2 objects through the S3 API

EOF
)"
```

---

### Task 5: Catalog page

**Files:**
- Modify: `app/page.tsx` (replace the empty scaffold page)
- Modify: `app/layout.tsx` (metadata title/description only)
- Modify: `app/globals.css` only if tokens need to live there; prefer page-level Tailwind classes

**Interfaces:**
- Consumes: `loadCatalog` from `lib/r2/catalog.ts`, `createR2Store` from `lib/r2/client.ts`
- Produces: `/` Server Component that:
  - calls `loadCatalog(process.env, createR2Store(process.env))`
  - if `configured === false`, shows setup copy listing `missingEnv`
  - else shows Images (thumbnail grid) and Audios (filename + `<audio controls>`)
  - empty ok section: `No images in images/` / `No audios in audios/`
  - error section: inline message from `section.message`
  - labels use `item.displayName`; `img`/`audio` `src={item.url}`
  - images: dense grid, no lightbox

Visual direction (do not use cream+serif, black+acid-green, or newspaper-column defaults):

- Subject: a personal meme cutting-mat — quick grab, not a gallery
- Palette: cutting-mat `#1f6b4a`, kraft `#e6d3b1`, grease-pencil `#f4e27a`, ink `#1a140c`, tape `#f2efe6`
- Type: display `Syne` (or another condensed grotesque if Syne is already overused in the tree), body `IBM Plex Sans`, labels `IBM Plex Mono`
- Signature: folder-tab headers (`IMAGES` / `AUDIOS`) over a dense contact sheet, like labeled piles on a mat

- [ ] **Step 1: Update root layout metadata**

In `app/layout.tsx`, set:

```ts
export const metadata = {
  title: "MemeDrive",
  description: "Quick-reference catalog of images and audio from R2",
};
```

Keep the create-next-app font/layout structure. Add the chosen Google fonts via `next/font` if the scaffold already uses that pattern.

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
import { createR2Store } from "@/lib/r2/client";
import {
  loadCatalog,
  type CatalogItem,
  type CatalogSection,
} from "@/lib/r2/catalog";

export const dynamic = "force-dynamic";

function Setup({ missingEnv }: { missingEnv: string[] }) {
  return (
    <section>
      <h1>MemeDrive</h1>
      <p>Set these variables in .env.local, then restart the dev server.</p>
      <ul>
        {missingEnv.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </section>
  );
}

function ImageGrid({ items }: { items: CatalogItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.displayName} />
          <p>{item.displayName}</p>
        </li>
      ))}
    </ul>
  );
}

function AudioList({ items }: { items: CatalogItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.key}>
          <p>{item.displayName}</p>
          <audio controls preload="metadata" src={item.url} />
        </li>
      ))}
    </ul>
  );
}

function MediaSection({
  title,
  emptyLabel,
  section,
  kind,
}: {
  title: string;
  emptyLabel: string;
  section: CatalogSection;
  kind: "image" | "audio";
}) {
  return (
    <section>
      <h2>{title}</h2>
      {section.status === "error" ? (
        <p>{section.message}</p>
      ) : section.items.length === 0 ? (
        <p>{emptyLabel}</p>
      ) : kind === "image" ? (
        <ImageGrid items={section.items} />
      ) : (
        <AudioList items={section.items} />
      )}
    </section>
  );
}

export default async function HomePage() {
  const catalog = await loadCatalog(process.env, createR2Store(process.env));

  if (!catalog.configured) {
    return <Setup missingEnv={catalog.missingEnv} />;
  }

  return (
    <main>
      <h1>MemeDrive</h1>
      <MediaSection
        title="Images"
        emptyLabel="No images in images/"
        section={catalog.images}
        kind="image"
      />
      <MediaSection
        title="Audios"
        emptyLabel="No audios in audios/"
        section={catalog.audios}
        kind="audio"
      />
    </main>
  );
}
```

Apply the visual tokens with Tailwind on this markup (do not change the structure or copy). The `img` element is required by the spec (signed R2 hosts are not in `next/image` remotePatterns).

- [ ] **Step 3: Verify tests and build**

```bash
npm test
npm run build
```

Expected: all unit tests PASS; `next build` succeeds.

- [ ] **Step 4: Manual check without env**

```bash
npm run dev
```

Open `/`. Expected: setup message listing the four required variables (HTTP 200). Stop the server after checking.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css
git commit -m "$(cat <<'EOF'
feat: render R2 image and audio catalog on the home page

EOF
)"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Next.js App Router + TS + Tailwind in this directory | 1 |
| Preserve `docs/` | 1 |
| `.env.example` + runtime `.env.local` | 1 |
| Kind + contentType unit tests | 2 |
| S3-like list → items (placeholders dropped) | 3 |
| Missing env skips R2 | 3, 5 |
| Independent prefix errors | 3, 5 |
| Sign failure omits one key | 3 |
| Pagination via continuation token | 3, 4 |
| Prefix-only list, private bucket, signed GET | 4 |
| Images grid + audio list, empty copy | 5 |
| `<img>` / `<audio>`, no lightbox/auth/upload | 5 |
| `npm run dev` / `npm run build` | 1, 5 |

**Out of scope (no tasks):** auth, uploads, public bucket, proxy, search, tagging, full-res viewer, live R2 CI.
