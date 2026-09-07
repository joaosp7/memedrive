"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogItem } from "@/lib/r2/catalog";
import { isDialogBackdropClick } from "./dialog-backdrop";

export function VideoGrid({ items }: { items: CatalogItem[] }) {
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
              aria-label={item.displayName}
              className="block w-full cursor-pointer border-0 bg-transparent p-0"
            >
              <span className="flex aspect-square w-full items-center justify-center bg-ink/10">
                <span
                  aria-hidden="true"
                  className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-ink/70"
                />
              </span>
            </button>
            <p className="truncate pt-1 font-label text-[10px] uppercase tracking-wide text-ink/75">
              {item.displayName}
            </p>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        aria-label="Video"
        onClose={dismiss}
        onClick={(event) => {
          if (isDialogBackdropClick(event.currentTarget, event.target)) {
            dismiss();
          }
        }}
        className="m-auto max-h-[90vh] max-w-[90vw] border-2 border-pencil bg-ink p-3 text-tape backdrop:bg-ink/80"
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
          <video
            controls
            playsInline
            src={selected.url}
            className="max-h-[80vh] max-w-full"
          />
        ) : null}
      </dialog>
    </>
  );
}
