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
