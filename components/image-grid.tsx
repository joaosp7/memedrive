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
