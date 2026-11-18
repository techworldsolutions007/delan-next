'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { useState, useEffect, useCallback } from "react";
import { Drawer } from "vaul";
import { X, ShoppingBag, Loader2, Check, Ruler, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { shopify } from "@/lib/shopify";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuickBuy } from "@/context/QuickBuyContext";
import { CART_CREATE, CART_LINES_ADD } from "@/lib/queries";
import { trackAddToCart } from "@/lib/analytics";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { isPreorder } from "@/lib/preorder";
import SizeChartSlider from "./SizeChartSlider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowRight } from "lucide-react"

const BRAND = "var(--brand-642, #642c44)";

/* -------------------------------------------------------------------------- */
/*                               GoKwik Helpers                               */
/* -------------------------------------------------------------------------- */
const normalizeGokwikEnv = (raw) => {
  const v = (raw || "").toLowerCase();
  if (["prod", "production", "live"].includes(v)) return "production";
  return "uat";
};

const GOKWIK_ENABLED =
  (process.env.NEXT_PUBLIC_ENABLE_GOKWIK || "false").toLowerCase() === "true";
const GOKWIK_MID = (process.env.NEXT_PUBLIC_GOKWIK_MERCHANT_ID || "").trim();
const GOKWIK_ENV = normalizeGokwikEnv(
  process.env.NEXT_PUBLIC_GOKWIK_ENV || "production"
);
const RAW_STORE_ID = (
  process.env.NEXT_PUBLIC_GOKWIK_STORE_ID ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_ID ||
  ""
).trim();
const GOKWIK_STORE_ID =
  Number.isFinite(Number(RAW_STORE_ID)) && RAW_STORE_ID !== ""
    ? Number(RAW_STORE_ID)
    : undefined;
const GOKWIK_FB_PIXEL = (process.env.NEXT_PUBLIC_FB_PIXEL_IDS || "").trim() || undefined;

const CART_ID_KEY = "shopifyCartId";

const GET_PRODUCT_QUICK_BUY = /* GraphQL */ `
  query getProductQuickBuy($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      options(first: 10) {
        id
        name
        values
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            price { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      collections(first: 5) { edges { node { handle title } } }
    }
  }
`;

export default function QuickBuyDrawer() {
  const { isOpen, product, closeQuickBuy } = useQuickBuy();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [gokwikReady, setGokwikReady] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const isMobile = useIsMobile();
  const router = useRouter();

  /* ------------------------ GoKwik: init SDK once ------------------------ */
  useEffect(() => {
    if (!GOKWIK_ENABLED || !GOKWIK_MID) {
      setGokwikReady(false);
      return;
    }

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
        try { if (window.gokwikSdk?.init) window.gokwikSdk.init(); } catch { }
        setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));

        window.triggerGokwikCheckout = function triggerGokwikCheckout(cartId) {
          window.merchantInfo = {
            ...(window.merchantInfo || {}),
            mid: GOKWIK_MID,
            merchantId: GOKWIK_MID,
            environment: GOKWIK_ENV,
            type: "merchantInfo",
            ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
            ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
            cart: { id: cartId },
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

  const triggerGokwikOrFallback = useCallback(
    async (cartId, maybeCheckoutUrl) => {
      releaseFocusForCheckout();
      if (GOKWIK_ENABLED && GOKWIK_MID && typeof window.triggerGokwikCheckout === "function") {
        try {
          window.triggerGokwikCheckout(cartId);
          return;
        } catch { }
      }

      if (maybeCheckoutUrl) {
        window.open(maybeCheckoutUrl, "_blank", "noopener,noreferrer");
        return;
      }
      window.open("/cart", "_blank", "noopener,noreferrer");
    },
    []
  );

  // Reset image index when product changes
  useEffect(() => {
    if (isOpen) setActiveImageIdx(0);
  }, [isOpen, product?.handle]);

  // Fetch full details when opened
  useEffect(() => {
    if (!isOpen || !product?.handle) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await shopify(GET_PRODUCT_QUICK_BUY, { handle: product.handle });
        if (cancelled || !data?.product) return;

        const p = data.product;
        setDetails(p);

        // Default options
        const defaults = {};
        (p.options || []).forEach((opt) => {
          if (opt.values?.length) defaults[opt.name] = opt.values[0];
        });
        setSelectedOptions(defaults);
      } catch (err) {
        console.error("QuickBuy fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, product?.handle]);

  // Sync selected variant
  useEffect(() => {
    if (!details) return;
    const variant = details.variants.edges.find((e) => {
      return e.node.selectedOptions.every(
        (opt) => selectedOptions[opt.name] === opt.value
      );
    })?.node;
    setSelectedVariant(variant || null);
  }, [details, selectedOptions]);

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return;
    setAdding(true);
    try {
      let cartId = localStorage.getItem("shopifyCartId");
      if (!cartId) {
        const res = await shopify(CART_CREATE);
        cartId = res?.cartCreate?.cart?.id;
        if (cartId) localStorage.setItem("shopifyCartId", cartId);
      }
      
      const res = await shopify(CART_LINES_ADD, {
        cartId,
        lines: [{ merchandiseId: selectedVariant.id, quantity: 1 }],
      });
      
      const cartData = res?.cartLinesAdd?.cart;
      const total = cartData?.totalQuantity ?? 0;
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: { totalQuantity: total } }));
      window.dispatchEvent(new CustomEvent("cart:item-added"));
      trackAddToCart({
        productGid: details?.id,
        variantGid: selectedVariant?.id,
        productTitle: details?.title,
        variantTitle: selectedVariant?.title,
        price: selectedVariant?.price?.amount ?? '0',
        cartId: cartData?.id ?? cartId ?? '',
        quantity: 1,
      });
      closeQuickBuy();
    } catch (e) {
      alert("Could not add to cart");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant?.id) return;

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

      await triggerGokwikOrFallback(cartId, checkoutUrl);
      closeQuickBuy();
    } catch (e) {
      console.error(e);
      alert("Could not proceed to checkout");
    } finally {
      setBuying(false);
    }
  };

  if (!product) return null;

  const images = details?.images?.edges?.map((e) => e.node) ??
    (product.imageUrl ? [{ url: product.imageUrl, altText: product.title }] : []);
  const activeImage = images[activeImageIdx] ?? images[0];

  const prevImage = () => setActiveImageIdx((i) => (i - 1 + images.length) % images.length);
  const nextImage = () => setActiveImageIdx((i) => (i + 1) % images.length);

  /* ---- shared sub-panels ---- */

  const imagePanel = (
    <div className="relative h-full w-full overflow-hidden bg-neutral-100">
      {activeImage?.url && (
        <Image
          src={activeImage.url}
          alt={activeImage.altText || product.title}
          fill
          className="object-cover"
          priority
        />
      )}
      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/75 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
            style={{ color: '#642c44' }}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button
            onClick={nextImage}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/75 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
            style={{ color: '#642c44' }}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImageIdx(i)}
                aria-label={`Image ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIdx ? 'bg-white scale-125' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  const optionsAndActions = (
    <>
      {loading ? (
        <div className="space-y-5">
          <Skeleton className="h-5 w-28" />
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-10 w-14" />
            <Skeleton className="h-10 w-14" />
            <Skeleton className="h-10 w-14" />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {details?.options?.map((opt) => (
            <div key={opt.id} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-bold montserrat-600">
                  Select {opt.name}
                </label>
                {opt.name.toLowerCase().includes("size") && (
                  <button
                    onClick={() => setIsSizeChartOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/70 hover:text-primary transition-colors montserrat-600"
                  >
                    <Ruler size={13} />
                    Size Guide
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((val) => {
                  const active = selectedOptions[opt.name] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelectedOptions((prev) => ({ ...prev, [opt.name]: val }))}
                      className={`h-9 px-3 min-w-[40px] rounded-[6px] border transition-all duration-150 montserrat-600 text-[11px] uppercase tracking-[0.1em] ${
                        active
                          ? 'border-[#642c44] bg-[#642c44] text-white'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#642c44]/40 hover:text-[#642c44]'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              onClick={handleBuyNow}
              disabled={!selectedVariant?.availableForSale || buying}
              className="h-12 w-full rounded-[8px] montserrat-700 text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ backgroundColor: '#642c44', color: '#eef4f8' }}
            >
              {buying ? <Loader2 size={15} className="animate-spin" /> : <><ArrowRight size={14} className="opacity-80" />Buy Now</>}
            </Button>
            <Button
              variant="outline"
              onClick={handleAddToCart}
              disabled={!selectedVariant?.availableForSale || adding}
              className="h-12 w-full rounded-[8px] montserrat-700 text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ borderWidth: '1.5px', borderColor: '#642c44', color: '#642c44' }}
            >
              {adding ? <Loader2 size={15} className="animate-spin" /> : <><ShoppingBag size={14} className="opacity-80" />Add to Bag</>}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  /* ---- mobile: stacked ---- */
  const mobileContent = (
    <>
      <div className="mx-auto w-12 h-1.5 rounded-full bg-neutral-200 mt-3 mb-0 flex-shrink-0" />
      <div className="relative w-full flex-shrink-0 overflow-hidden bg-neutral-100" style={{ aspectRatio: '3/4', maxHeight: '45vh' }}>
        {imagePanel}
        <button
          onClick={closeQuickBuy}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
          style={{ color: '#642c44' }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
      <div className="px-5 pt-4 pb-8 overflow-y-auto no-scrollbar flex-1">
        <h2
          className="cormorant-garamond-700 text-2xl text-primary leading-tight tracking-[0.025em] uppercase cursor-pointer hover:underline mb-0.5"
          onClick={() => { closeQuickBuy(); router.push(`/products/${details?.handle || product.handle}`); }}
        >
          {product.title}
        </h2>
        <p className="montserrat-600 text-lg tracking-[0.05em] mb-4" style={{ color: BRAND }}>
          Rs. {Number(product.price).toFixed(0)}
        </p>
        {optionsAndActions}
      </div>
    </>
  );

  /* ---- desktop: side-by-side ---- */
  const desktopContent = (
    <div className="flex h-full">
      {/* Left — image */}
      <div className="relative w-[48%] flex-shrink-0">
        {imagePanel}
      </div>

      {/* Right — info + actions */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Close button top-right */}
        <div className="flex justify-end px-5 pt-4 flex-shrink-0">
          <button
            onClick={closeQuickBuy}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
            style={{ color: '#642c44' }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="px-5 pb-6 overflow-y-auto no-scrollbar flex-1">
          <h2
            className="cormorant-garamond-700 text-2xl text-primary leading-tight tracking-[0.025em] uppercase cursor-pointer hover:underline mb-1"
            onClick={() => { closeQuickBuy(); router.push(`/products/${details?.handle || product.handle}`); }}
          >
            {product.title}
          </h2>
          <p className="montserrat-600 text-xl tracking-[0.05em] mb-5" style={{ color: BRAND }}>
            Rs. {Number(product.price).toFixed(0)}
          </p>
          {optionsAndActions}
        </div>
      </div>
    </div>
  );

  const content = isMobile ? mobileContent : desktopContent;

  return (
    <>
      {isMobile ? (
        <Drawer.Root 
          open={isOpen} 
          onOpenChange={(open) => {
            if (!open && !isSizeChartOpen) closeQuickBuy();
          }}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]" />
            <Drawer.Content 
              className="bg-white flex flex-col rounded-t-xl h-auto max-h-[92vh] fixed bottom-0 left-0 right-0 z-[101] outline-none shadow-2xl overflow-hidden"
              onInteractOutside={(e) => {
                if (isSizeChartOpen) {
                  e.preventDefault();
                }
              }}
            >
              <Drawer.Title className="sr-only">Quick Buy</Drawer.Title>
              {content}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            if (!open && !isSizeChartOpen) closeQuickBuy();
          }}
        >
          <DialogContent 
            showCloseButton={false} 
            className="sm:max-w-[620px] w-full p-0 overflow-hidden rounded-xl h-[560px]"
            onInteractOutside={(e) => {
              if (isSizeChartOpen) {
                e.preventDefault();
              }
            }}
          >
            <DialogTitle className="sr-only">Quick Buy</DialogTitle>
            {content}
          </DialogContent>
        </Dialog>
      )}

      <SizeChartSlider 
        isOpen={isSizeChartOpen} 
        onClose={() => setIsSizeChartOpen(false)} 
        productHandle={details?.handle || product?.handle} 
      />
    </>
  );
}
