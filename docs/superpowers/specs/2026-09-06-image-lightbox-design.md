# Image lightbox — click thumbnail to view

Date: 2026-09-06  
Status: approved design

## Purpose

Let a visitor click an image thumbnail on `/` and see that same file in a modal at its natural aspect ratio. Thumbnails stay square crops; the modal is for looking at the picture, not for browsing or metadata.

This replaces the scaffold spec’s “no lightbox” constraint for images. Audio is unchanged.

## Constraints

- Image only in the modal (no filename, prev/next, zoom, or download chrome).
- Close via overlay (backdrop) click, Escape, and a close control.
- Reuse the thumbnail’s existing signed URL. No extra R2 fetch, no media proxy.
- No new routes, query string, or hash. Selected image is client state only.
- No new UI libraries.
- Keep the cutting-mat visual language (mat, kraft, pencil, ink, tape).

## Architecture

The home page remains a Server Component and still loads the catalog on the server.

The image grid becomes a Client Component in `components/image-grid.tsx`. It receives `CatalogItem[]` (`key`, `url`, `displayName`, and whatever else the catalog already provides). It owns:

1. Which item is open (`CatalogItem | null`).
2. A `<dialog>` shown with `showModal()` when an item is selected, closed when selection is cleared.

R2 listing, signing, env setup, and section error/empty states stay in the existing catalog path. `MediaSection` keeps rendering `ImageGrid` for images.

## Components

**Thumbnail.** Each grid cell’s image is wrapped in a `<button>`. The square `object-cover` thumbnail and the truncated filename under it stay as they are. The button is the only open control (keyboard and pointer).

**Dialog.** One `<dialog>` for the grid, not one per item. Contents:

- The selected image (`<img src={item.url} alt={item.displayName}>`) with `object-contain`, sized to fit the viewport.
- A close control (visible, labeled, e.g. “Close”).

No filename, caption, or gallery arrows inside the dialog.

**Close behavior.**

| Action | Result |
|---|---|
| Close control | `close()` the dialog, set selection to `null` |
| Escape | Native `<dialog>` cancel while modal; same result |
| Click the backdrop | If the click target is the dialog element itself (not the image or close control), close |
| Click the image | Does not close |

On close, focus returns to the thumbnail button that opened the dialog.

**Styling.** Dark overlay, kraft close control, ink/pencil edges. No new colors or typefaces. Prefer no motion, or honor `prefers-reduced-motion` if a brief open/close transition is used.

## Data flow

1. Server loads catalog and passes image items into `ImageGrid`.
2. User activates a thumbnail → selected item is that `CatalogItem`.
3. Effect or render path calls `showModal()` on the dialog.
4. Modal `<img>` uses `item.url` (same signed GET as the thumbnail).
5. Any close path clears selection and calls `close()` on the dialog.

Expired signed URLs still require a page refresh, as in the scaffold.

## Error handling

- Catalog, missing env, and per-section R2 errors are unchanged.
- A broken modal image uses the browser’s failed-image rendering. No extra error UI.
- Without JavaScript, thumbnails still render; the modal does not open.

## Testing

Existing catalog unit tests stay as they are. Do not add a React Testing Library suite for this slice.

Verify in the browser on `/` with images present:

- Click a thumbnail → modal shows that image, uncropped, fitted to the viewport.
- Close control, Escape, and backdrop click each dismiss the modal.
- Clicking the image does not dismiss.
- Filename remains under the thumbnail only.
- Audio section is unaffected.
- Empty and error image sections still have no grid, so no modal.

## File sketch

```
app/page.tsx                 # RSC: catalog + MediaSection
components/image-grid.tsx    # client: thumbnails + <dialog>
```

## Out of scope

Prev/next, filename in the modal, pinch/zoom, a second higher-res URL, URL-synced selection, dialog libraries, tests against live R2.

## Success criteria

- Clicking (or focusing and activating) an image thumbnail opens a modal of that image.
- The three close paths work; the image click does not close.
- The same signed URL is used for thumbnail and modal.
- No new dependencies and no R2 API changes.
