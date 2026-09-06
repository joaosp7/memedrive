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
    .filter(
      (key): key is string =>
        typeof key === "string" && key.length > 0 && !key.endsWith("/"),
    );
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
    } catch (error) {
      // omit keys that cannot be signed, but surface why for diagnosis
      console.warn(`Failed to sign key "${key}":`, error);
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
