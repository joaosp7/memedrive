# Image Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking an image thumbnail on `/` opens a `<dialog>` showing that same signed image at its natural aspect ratio, closable via Close, Escape, or backdrop click.

**Architecture:** Keep `app/page.tsx` a Server Component. Move the grid into `components/image-grid.tsx` (`"use client"`). One dialog per grid; selected item is `CatalogItem | null`. Backdrop-vs-content clicks are a tiny pure helper so the close rule can be unit-tested without React Testing Library.

**Tech Stack:** Next.js App Router, React 19 client components, native `<dialog>`, Tailwind v4 tokens already in `app/globals.css`, Vitest (existing `npm test`).

## Global Constraints

- Image only in the modal (no filename, prev/next, zoom, or download chrome)
- Close via overlay (backdrop) click, Escape, and a close control
- Reuse the thumbnail’s existing signed URL; no extra R2 fetch, no media proxy
- No new routes, query string, or hash; selected image is client state only
- No new UI libraries; no new npm dependencies
- Keep the cutting-mat visual language (mat, kraft, pencil, ink, tape)
- Do not add a React Testing Library suite
- No R2 API or catalog-module changes
- Home page stays a Server Component; `components/image-grid.tsx` is the client island
- Filename stays under the thumbnail only
- Prefer no motion (do not add open/close transitions)
- Clicking the image does not close the dialog
- On close, focus returns to the thumbnail button that opened the dialog (native `<dialog>` + `showModal()`)

## File map

| File | Responsibility |
|---|---|
| `components/dialog-backdrop.ts` | Pure `isDialogBackdropClick(currentTarget, target)` |
| `components/dialog-backdrop.test.ts` | Unit tests for backdrop vs content clicks |
| `components/image-grid.tsx` | Client thumbnails + one `<dialog>` |
| `app/page.tsx` | Delete inline `ImageGrid`; import the client grid |

---

### Task 1: Backdrop click helper

**Files:**
- Create: `components/dialog-backdrop.ts`
- Test: `components/dialog-backdrop.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `isDialogBackdropClick(currentTarget: EventTarget, target: EventTarget | null): boolean` — `true` only when `target === currentTarget` (click landed on the dialog element, i.e. the backdrop)

- [ ] **Step 1: Write the failing test**

Create `components/dialog-backdrop.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isDialogBackdropClick } from "./dialog-backdrop";

describe("isDialogBackdropClick", () => {
  it("is true when the click target is the dialog itself", () => {
    const dialog = { id: "dialog" };
    expect(isDialogBackdropClick(dialog, dialog)).toBe(true);
  });

  it("is false when the click target is a child (image or close control)", () => {
    const dialog = { id: "dialog" };
    const image = { id: "image" };
    expect(isDialogBackdropClick(dialog, image)).toBe(false);
  });

  it("is false when target is null", () => {
    const dialog = { id: "dialog" };
    expect(isDialogBackdropClick(dialog, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/dialog-backdrop.test.ts`

Expected: FAIL, cannot resolve `./dialog-backdrop` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `components/dialog-backdrop.ts`:

```ts
export function isDialogBackdropClick(
  currentTarget: EventTarget,
  target: EventTarget | null,
): boolean {
  return target === currentTarget;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/dialog-backdrop.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add components/dialog-backdrop.ts components/dialog-backdrop.test.ts
git commit -m "feat: detect dialog backdrop clicks"
```

---

### Task 2: Client image grid with modal

**Files:**
- Create: `components/image-grid.tsx`
- Modify: none yet (`app/page.tsx` still has the old inline grid until Task 3)

**Interfaces:**
- Consumes: `CatalogItem` from `@/lib/r2/catalog` (`key`, `contentType`, `url`, `displayName`); `isDialogBackdropClick` from `./dialog-backdrop`
- Produces: `export function ImageGrid({ items }: { items: CatalogItem[] }): JSX.Element`

- [ ] **Step 1: Create `components/image-grid.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogItem } from "@/lib/r2/catalog";
import { isDialogBackdropClick } from "./dialog-backdrop";

export function ImageGrid({ items }: { items: CatalogItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [selected]);

  function dismiss() {
    setSelected(null);
  }

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="rounded-sm bg-kraft p-1 shadow-[2px_2px_0_0_rgb(26_20_12_/_0.45)]"
          >
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="block w-full cursor-pointer border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.displayName}
                className="aspect-square w-full bg-ink/10 object-cover"
              />
            </button>
            <p className="truncate pt-1 font-label text-[10px] uppercase tracking-wide text-ink/75">
              {item.displayName}
            </p>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        aria-label="Image"
        onClose={dismiss}
        onClick={(event) => {
          if (isDialogBackdropClick(event.currentTarget, event.target)) {
            dismiss();
          }
        }}
        className="max-h-[90vh] max-w-[90vw] border-2 border-pencil bg-ink p-3 text-tape backdrop:bg-ink/80"
      >
        <form method="dialog" className="mb-2 flex justify-end">
          <button
            type="submit"
            className="border-2 border-ink bg-kraft px-3 py-1 font-label text-xs font-semibold uppercase tracking-wide text-ink"
          >
            Close
          </button>
        </form>
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.url}
            alt={selected.displayName}
            className="max-h-[80vh] max-w-full object-contain"
          />
        ) : null}
      </dialog>
    </>
  );
}
```

Notes the implementer must keep:

- `"use client"` is the first line.
- Thumbnail `<img>` stays `object-cover` + `aspect-square`. Modal `<img>` is `object-contain` and uses `selected.url` (same signed URL).
- Filename is a sibling of the button, not inside the dialog.
- Close uses `<form method="dialog">` so the submit button runs the dialog’s native `close()` (Escape also uses native cancel). `onClose` then sets `selected` to `null`. Do not put filename, arrows, or a second URL in the dialog.
- Do not add CSS transitions.
- Do not import new packages.

- [ ] **Step 2: Typecheck the new file**

Run: `npx tsc --noEmit`

Expected: PASS (no errors). If `dialog.open` or `showModal` fail types, stop — `lib` already includes `dom`.

- [ ] **Step 3: Commit**

```bash
git add components/image-grid.tsx
git commit -m "feat: add client image grid with dialog viewer"
```

---

### Task 3: Wire the home page

**Files:**
- Modify: `app/page.tsx` — remove the local `ImageGrid` function (currently lines 30–51) and import `ImageGrid` from `@/components/image-grid`

**Interfaces:**
- Consumes: `ImageGrid` from `@/components/image-grid`
- Produces: `/` still a Server Component; `MediaSection` still chooses image vs audio; empty/error image sections still skip the grid

- [ ] **Step 1: Replace the inline grid**

At the top of `app/page.tsx`, add:

```ts
import { ImageGrid } from "@/components/image-grid";
```

Delete this entire function (do not leave a duplicate name):

```tsx
function ImageGrid({ items }: { items: CatalogItem[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
      {items.map((item) => (
        <li
          key={item.key}
          className="rounded-sm bg-kraft p-1 shadow-[2px_2px_0_0_rgb(26_20_12_/_0.45)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.displayName}
            className="aspect-square w-full bg-ink/10 object-cover"
          />
          <p className="truncate pt-1 font-label text-[10px] uppercase tracking-wide text-ink/75">
            {item.displayName}
          </p>
        </li>
      ))}
    </ul>
  );
}
```

Leave `MediaSection`, `AudioList`, `Setup`, and `HomePage` unchanged. `MediaSection` already renders `<ImageGrid items={section.items} />` when `kind === "image"`.

- [ ] **Step 2: Run unit tests (catalog still green)**

Run: `npm test`

Expected: PASS, including `dialog-backdrop.test.ts` and existing `lib/r2/*.test.ts`.

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: open image thumbnails in a modal"
```

---

### Task 4: Browser verification

**Files:**
- None (manual check against the spec). If a check fails, fix in `components/image-grid.tsx` and amend only if the last commit is yours, unpushed, and the hook did not reject it; otherwise make a new fix commit.

**Interfaces:**
- Consumes: running app with configured `.env.local` and at least one object under `images/`
- Produces: evidence that the success criteria hold

- [ ] **Step 1: Run the app**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm the Images section still shows the square grid and Audios still lists players.

- [ ] **Step 2: Open path**

Click a thumbnail. Expected:

- A modal appears with that image, not cropped to a square.
- The image is fitted to the viewport (`object-contain`).
- The dialog does not show the filename (filename remains under the thumbnail in the grid).
- Thumbnail and modal use the same `src` (DevTools: both URLs match).

Keyboard: Tab to a thumbnail, Enter or Space. Expected: same modal.

- [ ] **Step 3: Close paths**

With the modal open:

1. Click **Close** → dialog dismisses; focus returns to the thumbnail button.
2. Open again, press Escape → dismisses.
3. Open again, click the dark backdrop (not the image) → dismisses.
4. Open again, click the image → stays open.

- [ ] **Step 4: Unchanged surfaces**

- Play an audio control: still works; no dialog.
- If you can force an empty Images section (or recall the empty copy), there is no grid and no modal. Do not change empty/error markup.

If the app cannot load R2 in this environment, still confirm `npm test` and `npm run lint` passed in Task 3 and record that browser checks were skipped for missing env — then stop; do not fake a pass.

- [ ] **Step 5: Commit only if you changed code to fix verification**

If no code changed, do not create an empty commit.

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Click thumbnail opens modal of that image | 2, 3, 4 |
| Natural aspect / object-contain in modal | 2, 4 |
| Square object-cover thumbnails unchanged | 2, 4 |
| Image only (no filename/prev/next/zoom) | 2, 4 |
| Close: button, Escape, backdrop | 1, 2, 4 |
| Image click does not close | 1, 2, 4 |
| Same signed URL | 2, 4 |
| Client state only; no new routes | 2, 3 |
| No new libraries / no R2 changes | all |
| Cutting-mat tokens | 2 |
| Focus returns to opener | 2 (`showModal`), 4 |
| RSC home page; grid is client | 2, 3 |
| No RTL; catalog tests stay | 1, 3 |
| Empty/error sections unchanged | 3, 4 |
| Broken image = browser default | 2 (no extra error UI) |
| No motion | 2 |
