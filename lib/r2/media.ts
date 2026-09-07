export type MediaKind = "image" | "audio" | "video" | "unknown";

export const IMAGE_PREFIX = "images/";
export const AUDIO_PREFIX = "audios/";
export const VIDEO_PREFIX = "videos/";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"]);
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac", "oga"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);

const KIND_BY_PREFIX: Array<[string, Exclude<MediaKind, "unknown">]> = [
  [IMAGE_PREFIX, "image"],
  [AUDIO_PREFIX, "audio"],
  [VIDEO_PREFIX, "video"],
];

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
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  ogv: "video/ogg",
};

function extensionOf(key: string): string {
  const base = key.split("/").pop() ?? key;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function mediaKindFromKey(key: string): MediaKind {
  for (const [prefix, kind] of KIND_BY_PREFIX) {
    if (key.startsWith(prefix)) return kind;
  }
  const ext = extensionOf(key);
  if (IMAGE_EXT.has(ext)) return "image";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (VIDEO_EXT.has(ext)) return "video";
  return "unknown";
}

export function contentTypeFromKey(key: string): string {
  return CONTENT_TYPES[extensionOf(key)] ?? "application/octet-stream";
}

export function displayNameFromKey(key: string): string {
  for (const [prefix] of KIND_BY_PREFIX) {
    if (key.startsWith(prefix)) return key.slice(prefix.length);
  }
  return key;
}
