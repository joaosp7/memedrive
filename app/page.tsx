import { ImageGrid } from "@/components/image-grid";
import { createR2Store } from "@/lib/r2/client";
import {
  loadCatalog,
  type CatalogItem,
  type CatalogSection,
} from "@/lib/r2/catalog";

export const dynamic = "force-dynamic";

function Setup({ missingEnv }: { missingEnv: string[] }) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-5 px-6 py-16">
      <h1 className="font-display text-5xl font-extrabold uppercase tracking-tight text-kraft">
        MemeDrive
      </h1>
      <p className="max-w-prose text-tape/85">
        Set these variables in .env.local, then restart the dev server.
      </p>
      <ul className="divide-y divide-kraft/20 rounded-sm border-2 border-ink/40 bg-ink/25 font-label text-sm text-pencil">
        {missingEnv.map((name) => (
          <li key={name} className="px-4 py-2">
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AudioList({ items }: { items: CatalogItem[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-l-4 border-pencil bg-kraft px-3 py-2"
        >
          <p className="font-label text-xs font-semibold uppercase tracking-wide text-ink">
            {item.displayName}
          </p>
          <audio
            controls
            preload="metadata"
            src={item.url}
            className="w-full max-w-sm"
          />
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
    <section className="rounded-sm rounded-tl-none border-2 border-ink/40 bg-ink/15 p-3">
      <h2 className="-ml-3 -mt-3 mb-3 inline-block rounded-br-sm bg-kraft px-4 py-1.5 font-display text-sm font-extrabold uppercase tracking-[0.25em] text-ink">
        {title}
      </h2>
      {section.status === "error" ? (
        <p className="rounded-sm border border-pencil/50 bg-ink/55 px-3 py-2 font-label text-sm text-pencil">
          {section.message}
        </p>
      ) : section.items.length === 0 ? (
        <p className="font-label text-xs uppercase tracking-[0.2em] text-tape/55">
          {emptyLabel}
        </p>
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="border-b-4 border-pencil pb-2 font-display text-4xl font-extrabold uppercase tracking-tight text-kraft sm:text-6xl">
        MemeDrive
      </h1>
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
