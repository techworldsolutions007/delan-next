// Shared helpers for any checkout entrypoint (GoKwik / Shopify).

/**
 * Blur any focused element and close focus-trapping sheets before opening GoKwik.
 * Helps avoid Radix dialogs or other overlays from intercepting keyboard input.
 */
export function releaseFocusForCheckout() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    const active = document.activeElement;
    if (active && typeof active.blur === "function") {
      active.blur();
    }
  } catch {
    // ignore
  }

  try {
    const hasFocusTrap = document.querySelector("[data-radix-focus-guard]");
    if (hasFocusTrap) {
      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      });
      window.dispatchEvent(escEvent);
    }
  } catch {
    // ignore
  }
}
