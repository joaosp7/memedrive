import { describe, expect, it, vi } from "vitest";
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

  it("drops empty string keys", () => {
    expect(
      keysFromContents([{ Key: "" }, { Key: "images/cat.png" }]),
    ).toEqual(["images/cat.png"]);
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

  it("logs a warning naming the key and error when signing fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await itemsFromKeys(["images/nope.png"], async () => {
        throw new Error("sign failed");
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const [message, error] = warnSpy.mock.calls[0] ?? [];
      expect(String(message)).toContain("images/nope.png");
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("sign failed");
    } finally {
      warnSpy.mockRestore();
    }
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
    expect(catalog.videos).toEqual({ status: "ok", items: [] });
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

  it("keeps images when the videos prefix fails", async () => {
    const store: CatalogStore = {
      listKeys: async (prefix) => {
        if (prefix === "videos/") throw new Error("AccessDenied");
        if (prefix === "audios/") return [];
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
    expect(catalog.videos).toEqual({
      status: "error",
      message: "AccessDenied",
    });
  });
});
