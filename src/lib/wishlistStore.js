const WISHLIST_STORAGE_KEY = "wishlistProductIds";

export function readWishlistIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => String(value || "").trim())
      .filter((value, idx, arr) => value && arr.indexOf(value) === idx);
  } catch {
    return [];
  }
}

export function writeWishlistIds(ids = []) {
  if (typeof window === "undefined") return;
  try {
    const normalized = Array.isArray(ids)
      ? ids
          .map((value) => String(value || "").trim())
          .filter((value, idx, arr) => value && arr.indexOf(value) === idx)
      : [];
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalized));
  } catch {}
}

export function emitWishlistEvent(detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent("wishlist:updated", { detail }));
  } catch {}
}

export { WISHLIST_STORAGE_KEY };
