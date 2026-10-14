# GoKwik Checkout Integration — Delan Next.js

This document explains exactly how GoKwik's checkout popup is wired up across every entrypoint in the Delan store (cart sidebar, product page Buy Now, QuickBuy drawer, collection cards, home section cards). Copy this as the reference when reproducing the flow in another project.

---

## Table of Contents

1. [How it works — overview](#how-it-works--overview)
2. [Environment variables](#environment-variables)
3. [The shared helper — `checkout-helpers.js`](#the-shared-helper--checkout-helpersjs)
4. [SDK loading pattern (used in every component)](#sdk-loading-pattern-used-in-every-component)
5. [The trigger helper — `window.triggerGokwikCheckout`](#the-trigger-helper--windowtriggergokwikcheckout)
6. [The dispatcher — `triggerGokwikOrFallback`](#the-dispatcher--triggergokwikorFallback)
7. [Entrypoint 1 — Cart Sidebar (`CartSidebar.jsx`)](#entrypoint-1--cart-sidebar-cartSidebarjsx)
8. [Entrypoint 2 — Product Page Buy Now (`ProductHeader.jsx`)](#entrypoint-2--product-page-buy-now-productheaderjsx)
9. [Entrypoint 3 — QuickBuy Drawer (`QuickBuyDrawer.jsx`)](#entrypoint-3--quickbuy-drawer-quickbuydrawerjsx)
10. [Entrypoint 4 — Collection & Home cards](#entrypoint-4--collection--home-cards)
11. [Fallback behaviour](#fallback-behaviour)
12. [Popup-blocker trick for native Shopify fallback](#popup-blocker-trick-for-native-shopify-fallback)
13. [Full copy-paste snippets](#full-copy-paste-snippets)

---

## How it works — overview

```
User clicks "Checkout" / "Buy Now"
        │
        ▼
Add item to Shopify cart (GraphQL mutation) → get cartId
        │
        ▼
window.triggerGokwikCheckout(cartId)
        │  sets window.merchantInfo.cart = { id: cartId }
        │  then calls window.triggerGokwikCustomCheckout()   ← set by GoKwik SDK
        ▼
GoKwik popup opens
        │
        └─ if GoKwik disabled / SDK not ready → redirect to Shopify checkoutUrl
```

GoKwik never touches the DOM itself — it piggybacks on a `window.merchantInfo` object you populate, then you call its global `triggerGokwikCustomCheckout()`. The SDK is loaded once as a `<script>` tag injected into `<body>`.

---

## Environment variables

Add these to `.env.local` (or Vercel / hosting env):

```env
# Enable/disable GoKwik entirely without touching code
NEXT_PUBLIC_ENABLE_GOKWIK=true

# Your GoKwik merchant ID (from GoKwik dashboard)
NEXT_PUBLIC_GOKWIK_MERCHANT_ID=iwfimgqb38vs

# "production" | "uat" | "sandbox"
NEXT_PUBLIC_GOKWIK_ENV=production

# Numeric Shopify store ID (used as storeId in merchantInfo)
NEXT_PUBLIC_GOKWIK_STORE_ID=48574

# Optional — Facebook Pixel ID(s)
NEXT_PUBLIC_FB_PIXEL_IDS=
```

Read them at the top of every component file that needs GoKwik (they are `NEXT_PUBLIC_*` so they are available in the browser bundle):

```js
// Same block copy-pasted in every component that uses GoKwik
const envGet = (k) =>
  (typeof process !== "undefined" && process.env && process.env[k]) || "";

const normalizeGokwikEnv = (raw) => {
  const v = (raw || "").toLowerCase();
  if (["prod", "production", "live"].includes(v)) return "production";
  if (["uat", "sandbox", "test", "staging", "dev"].includes(v)) return "uat";
  return "uat";
};

const GOKWIK_ENABLED =
  (envGet("NEXT_PUBLIC_ENABLE_GOKWIK") || "false").toLowerCase() === "true";
const GOKWIK_MID = (envGet("NEXT_PUBLIC_GOKWIK_MERCHANT_ID") || "").trim();
const GOKWIK_ENV = normalizeGokwikEnv(
  envGet("NEXT_PUBLIC_GOKWIK_ENV") || "production"
);
const RAW_STORE_ID = (
  envGet("NEXT_PUBLIC_GOKWIK_STORE_ID") ||
  envGet("NEXT_PUBLIC_SHOPIFY_STORE_ID") ||
  ""
).trim();
const GOKWIK_STORE_ID =
  Number.isFinite(Number(RAW_STORE_ID)) && RAW_STORE_ID !== ""
    ? Number(RAW_STORE_ID)
    : undefined;
const GOKWIK_FB_PIXEL =
  (envGet("NEXT_PUBLIC_FB_PIXEL_IDS") || "").trim() || undefined;
```

---

## The shared helper — `checkout-helpers.js`

**File:** `src/lib/checkout-helpers.js`

Called right before opening the GoKwik popup. It blurs any focused element and fires a keyboard Escape to close Radix dialogs / sheets, which would otherwise trap focus and intercept GoKwik's overlay.

```js
// src/lib/checkout-helpers.js
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
```

Import it in any component that triggers GoKwik:

```js
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
```

---

## SDK loading pattern (used in every component)

Each component that can open GoKwik checkout runs **the same `useEffect`** on mount. It:

1. Sets `window.merchantInfo` with your credentials **before** the script loads.
2. Injects `<script id="gokwik-sdk" async src="...">` once — skips injection if the tag already exists.
3. In the `onload` callback, calls `window.gokwikSdk.init()` (if available) and registers the `window.triggerGokwikCheckout` helper.
4. Sets a `gokwikReady` state flag used to disable the checkout button while the SDK loads.

```jsx
// Inside your component
const [gokwikReady, setGokwikReady] = useState(false);

useEffect(() => {
  if (!GOKWIK_ENABLED || !GOKWIK_MID) {
    setGokwikReady(false);
    return;
  }

  // Set merchantInfo BEFORE the script loads
  window.merchantInfo = {
    ...(window.merchantInfo || {}),
    mid: GOKWIK_MID,
    merchantId: GOKWIK_MID,   // some SDK versions need this alias
    environment: GOKWIK_ENV,  // "production" | "uat"
    type: "merchantInfo",
    ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
    ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
  };

  if (!document.getElementById("gokwik-sdk")) {
    const s = document.createElement("script");
    s.id = "gokwik-sdk";
    s.async = true;
    s.src =
      "https://pdp.gokwik.co/merchant-integration/build/merchant.integration.js?v4";

    s.onload = () => {
      try {
        if (window.gokwikSdk?.init) window.gokwikSdk.init();
      } catch {}

      setGokwikReady(
        Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk)
      );

      // Register the helper that injects cartId just before triggering
      window.triggerGokwikCheckout = function triggerGokwikCheckout(cartId) {
        window.merchantInfo = {
          ...(window.merchantInfo || {}),
          mid: GOKWIK_MID,
          merchantId: GOKWIK_MID,
          environment: GOKWIK_ENV,
          type: "merchantInfo",
          ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
          ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
          cart: { id: cartId }, // <-- the key piece
        };
        if (typeof window.triggerGokwikCustomCheckout === "function") {
          window.triggerGokwikCustomCheckout(); // GoKwik popup opens
        }
      };
    };

    s.onerror = () => setGokwikReady(false);
    document.body.appendChild(s);
  } else {
    // Script tag already exists from another component — just read readiness
    setGokwikReady(
      Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk)
    );
  }
}, []);
```

> **Why inject it in components instead of `layout.jsx`?**
> We need `merchantInfo` set synchronously before the script evaluates. Injecting in components that own the checkout action keeps the setup collocated and avoids race conditions where the layout fires before the env vars are available.

---

## The trigger helper — `window.triggerGokwikCheckout`

Registered inside the SDK's `onload`. Call it with the Shopify cart GID to open the popup:

```js
// Opens GoKwik popup for the given Shopify cart
window.triggerGokwikCheckout("gid://shopify/Cart/abc123xyz");
```

Internally it:
1. Merges `cart: { id: cartId }` into `window.merchantInfo`.
2. Calls `window.triggerGokwikCustomCheckout()` — GoKwik's own global set by its SDK.

---

## The dispatcher — `triggerGokwikOrFallback`

A `useCallback` inside each component that tries GoKwik first and falls back to Shopify's `checkoutUrl` (or `/cart`):

```js
const triggerGokwikOrFallback = useCallback(
  async (cartId, maybeCheckoutUrl, preOpenedWindow = null) => {
    releaseFocusForCheckout(); // close Radix overlays, blur focus

    if (
      GOKWIK_ENABLED &&
      GOKWIK_MID &&
      typeof window.triggerGokwikCheckout === "function"
    ) {
      try {
        // Close the pre-opened blank tab (only used for non-GoKwik fallback)
        if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
        window.triggerGokwikCheckout(cartId);
        return; // done — GoKwik popup is open
      } catch {}
    }

    // Fallback: redirect to Shopify native checkout
    const target = maybeCheckoutUrl || "/cart";
    if (preOpenedWindow && !preOpenedWindow.closed) {
      preOpenedWindow.location.href = target;
    } else {
      window.location.href = target;
    }
  },
  []
);
```

---

## Entrypoint 1 — Cart Sidebar (`CartSidebar.jsx`)

**File:** `src/components/CartSidebar.jsx`

The cart sidebar has its own `startGoKwikCheckout` function (not `triggerGokwikOrFallback`) because the cart `id` is already in local state — no new Shopify API call is needed:

```jsx
const startGoKwikCheckout = useCallback(() => {
  const closeDrawer = () => onOpenChange?.(false);

  const fallbackToShopify = () => {
    closeDrawer();
    releaseFocusForCheckout();
    return checkoutUrl
      ? window.open(checkoutUrl, "_blank", "noopener,noreferrer")
      : showNotice("Checkout is temporarily unavailable. Please try again.");
  };

  const cartId = cart?.id; // already fetched — e.g. "gid://shopify/Cart/xxx"
  if (!cartId || !GOKWIK_ENABLED || !GOKWIK_MID) return fallbackToShopify();

  closeDrawer();
  releaseFocusForCheckout();

  try {
    if (typeof window.triggerGokwikCheckout === "function") {
      window.triggerGokwikCheckout(cartId);
      return;
    }

    // SDK ready but helper wasn't registered yet — inline fallback
    window.merchantInfo = {
      ...(window.merchantInfo || {}),
      mid: GOKWIK_MID,
      merchantId: GOKWIK_MID,
      environment: GOKWIK_ENV,
      type: "merchantInfo",
      ...(GOKWIK_STORE_ID ? { storeId: Number(GOKWIK_STORE_ID) } : {}),
      ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
      cart: { id: cartId },
    };
    if (typeof window.triggerGokwikCustomCheckout === "function") {
      window.triggerGokwikCustomCheckout();
      return;
    }
  } catch {
    // swallow, fall through
  }

  return fallbackToShopify();
}, [cart?.id, checkoutUrl, onOpenChange, showNotice]);
```

**Checkout button JSX:**

```jsx
<Button
  id="checkoutButton"
  disabled={lines.length === 0 || !cart?.id || (!gokwikReady && !checkoutUrl)}
  onClick={startGoKwikCheckout}
>
  Checkout
</Button>
```

---

## Entrypoint 2 — Product Page Buy Now (`ProductHeader.jsx`)

**File:** `src/components/Product/ProductHeader.jsx`

`handleBuyNow` must first **add the item to the cart** (async Shopify mutation), then trigger GoKwik.

Key detail: if GoKwik is disabled, a blank window is pre-opened **synchronously** inside the click handler before the async call. This defeats popup blockers (see [popup-blocker trick](#popup-blocker-trick-for-native-shopify-fallback)).

```jsx
const handleBuyNow = useCallback(async () => {
  // Gate: size must be selected
  if (sizeOptionName && !selectedSize) {
    focusSizeSelection();
    return;
  }
  if (!selectedVariant?.id) {
    alert("Please select an available option.");
    return;
  }

  // Pre-open a blank tab NOW (sync, inside click) so popup blocker won't fire
  // after the async Shopify API call. GoKwik will close it if it handles checkout.
  const preOpenedWindow =
    GOKWIK_ENABLED && GOKWIK_MID
      ? null // GoKwik opens its own popup — no need for a pre-opened tab
      : window.open("", "_blank", "noopener,noreferrer");

  setBuying(true);
  try {
    let cartId = localStorage.getItem(CART_ID_KEY);
    let checkoutUrl = null;

    if (!cartId) {
      // Create a brand-new cart with this item
      const res = await shopify(CART_CREATE, {
        lines: [{ merchandiseId: selectedVariant.id, quantity: 1 }],
      });
      const errs = res?.cartCreate?.userErrors;
      if (errs?.length) throw new Error(errs[0].message);
      cartId = res?.cartCreate?.cart?.id;
      checkoutUrl = res?.cartCreate?.cart?.checkoutUrl;
      if (cartId) localStorage.setItem(CART_ID_KEY, cartId);
      emitCartQty(res?.cartCreate?.cart?.totalQuantity ?? 1);
    } else {
      // Add to existing cart
      checkoutUrl = await doCartLinesAdd(selectedVariant.id, 1, /* skipOpen */ true);
    }

    window.dispatchEvent(new CustomEvent("cart:item-added"));

    await triggerGokwikOrFallback(cartId, checkoutUrl, preOpenedWindow);
  } catch (e) {
    if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
    alert(e?.message || "Could not proceed to checkout");
  } finally {
    setBuying(false);
  }
}, [selectedVariant?.id, selectedSize, sizeOptionName, focusSizeSelection, doCartLinesAdd, triggerGokwikOrFallback]);
```

**Buy Now button JSX:**

```jsx
<button
  type="button"
  onClick={handleBuyNow}
  disabled={!canAttemptAdd || buying}
>
  {buying ? "PROCEEDING..." : canAttemptAdd ? "Buy Now" : "SOLD OUT"}
</button>
```

---

## Entrypoint 3 — QuickBuy Drawer (`QuickBuyDrawer.jsx`)

**File:** `src/components/Product/QuickBuyDrawer.jsx`

Exactly the same pattern as Product Buy Now. The drawer appears on mobile as a `vaul` bottom sheet and on desktop as a Radix Dialog.

```jsx
const handleBuyNow = async () => {
  if (!selectedVariant?.id) return;

  const preOpenedWindow =
    GOKWIK_ENABLED && GOKWIK_MID
      ? null
      : window.open("", "_blank", "noopener,noreferrer");

  setBuying(true);
  try {
    let cartId = localStorage.getItem(CART_ID_KEY);
    let checkoutUrl = null;

    if (!cartId) {
      const res = await shopify(CART_CREATE, {
        lines: [{ merchandiseId: selectedVariant.id, quantity: 1 }],
      });
      const errs = res?.cartCreate?.userErrors;
      if (errs?.length) throw new Error(errs[0].message);
      cartId = res?.cartCreate?.cart?.id;
      checkoutUrl = res?.cartCreate?.cart?.checkoutUrl;
      if (cartId) localStorage.setItem(CART_ID_KEY, cartId);
      const total = res?.cartCreate?.cart?.totalQuantity ?? 1;
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: { totalQuantity: total } }));
    } else {
      const res = await shopify(CART_LINES_ADD, {
        cartId,
        lines: [{ merchandiseId: selectedVariant.id, quantity: 1 }],
      });
      const errs = res?.cartLinesAdd?.userErrors;
      if (errs?.length) throw new Error(errs[0].message);
      checkoutUrl = res?.cartLinesAdd?.cart?.checkoutUrl;
      const total = res?.cartLinesAdd?.cart?.totalQuantity ?? 0;
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: { totalQuantity: total } }));
    }

    window.dispatchEvent(new CustomEvent("cart:item-added"));

    await triggerGokwikOrFallback(cartId, checkoutUrl, preOpenedWindow);
    closeQuickBuy(); // close the drawer after GoKwik opens
  } catch (e) {
    if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
    alert("Could not proceed to checkout");
  } finally {
    setBuying(false);
  }
};
```

---

## Entrypoint 4 — Collection & Home cards

**Files:**
- `src/components/pages/Collection.jsx`
- `src/components/home/TopProducts.jsx`
- `src/components/home/TheCurrentEdit.jsx`
- `src/components/home/OfferSection.jsx`
- `src/components/Product/SuggestionSection.jsx`
- `src/components/Product/RecentlyViewed.jsx`

All use the **same SDK init `useEffect`** and the same **`triggerGokwikOrFallback` callback**. The "Buy Now" / "Quick Buy" buttons on product cards follow the same flow:

1. User clicks Buy Now on a card.
2. Component creates/updates Shopify cart via GraphQL.
3. Calls `triggerGokwikOrFallback(cartId, checkoutUrl)`.

No deviations — copy the SDK init block and `triggerGokwikOrFallback` into any new component that needs checkout.

---

## Fallback behaviour

| Condition | What happens |
|---|---|
| `NEXT_PUBLIC_ENABLE_GOKWIK=false` | Redirects to Shopify `checkoutUrl` |
| `NEXT_PUBLIC_GOKWIK_MERCHANT_ID` is empty | Same as above |
| SDK script fails to load | `gokwikReady = false`; button still works via Shopify URL |
| `window.triggerGokwikCheckout` not registered yet | Inline `merchantInfo` + direct `triggerGokwikCustomCheckout()` call tried first, then Shopify URL |
| Cart Sidebar: no `checkoutUrl` | Shows a notice: "Checkout is temporarily unavailable." |

---

## Popup-blocker trick for native Shopify fallback

Browsers block `window.open()` calls that happen after an `await`. To get around this when GoKwik is **disabled** and we need to open the Shopify checkout URL in a new tab:

```js
// 1. Open a blank window synchronously INSIDE the click handler (before any await)
const preOpenedWindow =
  GOKWIK_ENABLED && GOKWIK_MID
    ? null  // GoKwik handles its own popup; no need for this
    : window.open("", "_blank", "noopener,noreferrer");

// 2. Do async work (Shopify API call) ...
const checkoutUrl = await shopify(/* mutation */);

// 3. Navigate the pre-opened window to the checkout URL
if (preOpenedWindow && !preOpenedWindow.closed) {
  preOpenedWindow.location.href = checkoutUrl;
} else {
  window.location.href = checkoutUrl;
}

// Error handling: close the blank tab if something goes wrong
catch (e) {
  if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
}
```

When GoKwik IS enabled, `preOpenedWindow` is `null` and GoKwik opens its own iframe/popup internally — no pre-open trick is needed.

---

## Full copy-paste snippets

### Minimal GoKwik checkout component

```jsx
'use client';
import { useState, useEffect, useCallback } from "react";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";

const envGet = (k) =>
  (typeof process !== "undefined" && process.env && process.env[k]) || "";

const normalizeGokwikEnv = (raw) => {
  const v = (raw || "").toLowerCase();
  if (["prod", "production", "live"].includes(v)) return "production";
  return "uat";
};

const GOKWIK_ENABLED =
  (envGet("NEXT_PUBLIC_ENABLE_GOKWIK") || "false").toLowerCase() === "true";
const GOKWIK_MID = (envGet("NEXT_PUBLIC_GOKWIK_MERCHANT_ID") || "").trim();
const GOKWIK_ENV = normalizeGokwikEnv(envGet("NEXT_PUBLIC_GOKWIK_ENV") || "production");
const RAW_STORE_ID = (envGet("NEXT_PUBLIC_GOKWIK_STORE_ID") || "").trim();
const GOKWIK_STORE_ID =
  Number.isFinite(Number(RAW_STORE_ID)) && RAW_STORE_ID !== ""
    ? Number(RAW_STORE_ID)
    : undefined;
const GOKWIK_FB_PIXEL = (envGet("NEXT_PUBLIC_FB_PIXEL_IDS") || "").trim() || undefined;

export default function MyCheckoutButton({ cartId, checkoutUrl }) {
  const [gokwikReady, setGokwikReady] = useState(false);

  // Load SDK once
  useEffect(() => {
    if (!GOKWIK_ENABLED || !GOKWIK_MID) return;

    window.merchantInfo = {
      ...(window.merchantInfo || {}),
      mid: GOKWIK_MID,
      merchantId: GOKWIK_MID,
      environment: GOKWIK_ENV,
      type: "merchantInfo",
      ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
      ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
    };

    if (!document.getElementById("gokwik-sdk")) {
      const s = document.createElement("script");
      s.id = "gokwik-sdk";
      s.async = true;
      s.src = "https://pdp.gokwik.co/merchant-integration/build/merchant.integration.js?v4";
      s.onload = () => {
        try { if (window.gokwikSdk?.init) window.gokwikSdk.init(); } catch {}
        setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));

        window.triggerGokwikCheckout = function (cid) {
          window.merchantInfo = {
            ...(window.merchantInfo || {}),
            mid: GOKWIK_MID,
            merchantId: GOKWIK_MID,
            environment: GOKWIK_ENV,
            type: "merchantInfo",
            ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
            ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
            cart: { id: cid },
          };
          if (typeof window.triggerGokwikCustomCheckout === "function") {
            window.triggerGokwikCustomCheckout();
          }
        };
      };
      s.onerror = () => setGokwikReady(false);
      document.body.appendChild(s);
    } else {
      setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));
    }
  }, []);

  const handleCheckout = useCallback(() => {
    releaseFocusForCheckout();

    if (GOKWIK_ENABLED && GOKWIK_MID && cartId && typeof window.triggerGokwikCheckout === "function") {
      try {
        window.triggerGokwikCheckout(cartId);
        return;
      } catch {}
    }

    // Fallback
    if (checkoutUrl) window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  }, [cartId, checkoutUrl]);

  return (
    <button
      onClick={handleCheckout}
      disabled={!cartId || (!gokwikReady && !checkoutUrl)}
    >
      Checkout
    </button>
  );
}
```

---

### Shopify GraphQL mutations used

```graphql
# Create a new cart (and optionally add a line item)
mutation CartCreate($lines: [CartLineInput!]) {
  cartCreate(input: { lines: $lines }) {
    cart { id checkoutUrl totalQuantity }
    userErrors { field message }
  }
}

# Add items to an existing cart
mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart { id checkoutUrl totalQuantity }
    userErrors { message field }
  }
}
```

The `cart.id` returned is a GID like `gid://shopify/Cart/Z2NwLWFzaWEtc...` — pass this directly to `window.triggerGokwikCheckout`.

---

### Global events emitted after cart changes

Other components (navbar cart counter, etc.) listen for these:

```js
// After any cart mutation
window.dispatchEvent(new CustomEvent("cart:updated", {
  detail: { totalQuantity: newQty }
}));

// After adding an item (opens cart sidebar if listening)
window.dispatchEvent(new CustomEvent("cart:item-added"));

// To open the cart sidebar from anywhere
window.dispatchEvent(new CustomEvent("cart:open"));
```

---

*Last updated: September 2026*
