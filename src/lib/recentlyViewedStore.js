const STORAGE_KEY = "recentlyViewed";
const MAX_STORED_ITEMS = 12;

export const readRecentlyViewedHandles = () => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "")).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const writeRecentlyViewedHandles = (handles) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
  } catch {
    // ignore quota errors
  }
};

export const rememberRecentlyViewedHandle = (handle) => {
  const sanitized = String(handle || "").trim();
  if (!sanitized) return readRecentlyViewedHandles();
  const existing = readRecentlyViewedHandles().filter((item) => item !== sanitized);
  const next = [sanitized, ...existing].slice(0, MAX_STORED_ITEMS);
  writeRecentlyViewedHandles(next);
  return next;
};
