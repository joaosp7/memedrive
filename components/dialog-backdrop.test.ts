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
