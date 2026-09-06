export function isDialogBackdropClick(
  currentTarget: EventTarget,
  target: EventTarget | null,
): boolean {
  return target === currentTarget;
}
