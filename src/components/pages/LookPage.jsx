'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { shopify } from '@/lib/shopify';
import { trackAddToCart } from '@/lib/analytics';
import { usePageHead } from '@/hooks/usePageHead';
import {
  GET_LOOK_BY_HANDLE,
  normalizeLook_,
  formatLookPrice,
  sumLookMinPrices,
  cdnImage,
  cdnSrcSet,
} from '@/lib/looks';
import { CART_CREATE, CART_LINES_ADD } from '@/lib/queries';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const CART_ID_KEY = 'shopifyCartId';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSizeOption(product) {
  return product.options.find((o) => o.name.toLowerCase() === 'size') ?? null;
}

function findVariantBySize(product, sizeValue) {
  return product.variants.find((v) =>
    v.selectedOptions.some(
      (o) => o.name.toLowerCase() === 'size' && o.value === sizeValue
    )
  ) ?? null;
}

function getSelectedSizeValue(product, variantId) {
  if (!variantId) return null;
  const v = product.variants.find((x) => x.id === variantId);
  return v?.selectedOptions.find((o) => o.name.toLowerCase() === 'size')?.value ?? null;
}

function buildInitialSelections(products) {
  const s = {};
  for (const p of products) {
    const first = p.variants.find((v) => v.availableForSale) ?? p.variants[0];
    if (first) s[p.id] = first.id;
  }
  return s;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LookPageSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
        <div className="aspect-[3/4] bg-black/10" />
        <div className="space-y-6 pt-4">
          <div className="h-8 bg-black/10 w-2/3" />
          <div className="h-5 bg-black/10 w-1/3" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[2/3] bg-black/10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductSetRow({ product, selectedVariantId, onSelect }) {
  const sizeOption = getSizeOption(product);
  const selectedSize = getSelectedSizeValue(product, selectedVariantId);
  const priceStr = formatLookPrice(
    product.priceRange?.minVariantPrice?.amount,
    product.priceRange?.minVariantPrice?.currencyCode
  );

  return (
    <div className="flex gap-4 items-start py-4 border-b border-black/10">
      {/* Thumbnail */}
      <Link href={`/products/${product.handle}`} className="flex-shrink-0 block">
        <img
          src={cdnImage(product.imageUrl, 120)}
          alt={product.imageAlt}
          className="w-[100px] aspect-[2/3] object-contain bg-white"
          loading="lazy"
        />
      </Link>

      <div className="flex-1 min-w-0 pt-1">
        <Link href={`/products/${product.handle}`}>
          <p className="montserrat-500 text-xs uppercase tracking-[0.12em] line-clamp-2">
            {product.title}
          </p>
        </Link>
        <p className="montserrat-600 text-xs mt-1 tracking-[0.08em]">{priceStr}</p>

        {/* Size buttons */}
        {sizeOption && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sizeOption.values.map((sizeValue) => {
              const variant = findVariantBySize(product, sizeValue);
              const isAvail = variant?.availableForSale ?? false;
              const isSelected = selectedSize === sizeValue;

              return (
                <button
                  key={sizeValue}
                  type="button"
                  disabled={!isAvail}
                  onClick={() => variant && onSelect(product.id, variant.id)}
                  className={[
                    'px-2.5 py-1 text-[10px] montserrat-500 uppercase tracking-[0.10em] border transition-colors',
                    'focus-visible:outline focus-visible:outline-1 focus-visible:outline-black',
                    isSelected
                      ? 'bg-black text-white border-black'
                      : isAvail
                        ? 'bg-white text-black border-black hover:bg-black hover:text-white'
                        : 'border-black/30 text-black/30 line-through cursor-not-allowed',
                  ].join(' ')}
                >
                  {sizeValue}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LookJsonLd({ look }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: look.products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.title,
        url: `${SITE_URL}/products/${p.handle}`,
        image: p.imageUrl,
        offers: {
          '@type': 'Offer',
          priceCurrency: p.priceRange?.minVariantPrice?.currencyCode || 'INR',
          price: p.priceRange?.minVariantPrice?.amount || '0',
          availability: p.availableForSale
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function LookPage({ handle: handleProp, initialLook = null }) {
  const routerParams = useParams();
  const handle = handleProp || routerParams?.handle;

  const [look, setLook] = useState(initialLook);
  const [loading, setLoading] = useState(!initialLook);
  const [error, setError] = useState(null);

  const [selections, setSelections] = useState(() =>
    initialLook ? buildInitialSelections(initialLook.products) : {}
  );
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Fetch look if not provided server-side
  useEffect(() => {
    if (initialLook || !handle) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await shopify(GET_LOOK_BY_HANDLE, { handle });
        if (cancelled) return;
        const normalized = normalizeLook_(data?.metaobject);
        setLook(normalized);
        if (normalized) setSelections(buildInitialSelections(normalized.products));
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load look.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [handle, initialLook]);

  const { amount, currency } = useMemo(() => {
    if (!look) return { amount: '0', currency: 'INR' };
    return sumLookMinPrices(look);
  }, [look]);

  const totalStr = formatLookPrice(amount, currency);

  const canAddSet = useMemo(() => {
    if (!look) return false;
    return look.products.every((p) => {
      const variantId = selections[p.id];
      if (!variantId) return false;
      const variant = p.variants.find((v) => v.id === variantId);
      return variant?.availableForSale ?? false;
    });
  }, [look, selections]);

  usePageHead(
    look
      ? {
          title: `${look.title} — Shop the Look | DELAN`,
          description: `Shop the complete look — ${look.products
            .slice(0, 3)
            .map((p) => p.title)
            .join(', ')}`,
          image: cdnImage(look.image.url, 1200),
          url: typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/looks/${handle}`,
          type: 'product',
        }
      : {}
  );

  const handleSelect = (productId, variantId) => {
    setSelections((s) => ({ ...s, [productId]: variantId }));
  };

  const handleAddSet = async () => {
    if (!look || !canAddSet || adding) return;
    setAdding(true);
    try {
      let cartId = null;
      try { cartId = localStorage.getItem(CART_ID_KEY) || null; } catch { }

      const lines = look.products.map((p) => ({
        merchandiseId: selections[p.id],
        quantity: 1,
      }));

      let finalCartId = cartId;

      if (!cartId) {
        const res = await shopify(CART_CREATE, { lines });
        const errs = res?.cartCreate?.userErrors;
        if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
        finalCartId = res?.cartCreate?.cart?.id;
        if (!finalCartId) throw new Error('Cart creation failed.');
        try { localStorage.setItem(CART_ID_KEY, finalCartId); } catch { }
        const total = res?.cartCreate?.cart?.totalQuantity ?? 0;
        window.dispatchEvent(new CustomEvent('cart:updated', { detail: { totalQuantity: total } }));
      } else {
        const res = await shopify(CART_LINES_ADD, { cartId, lines });
        const errs = res?.cartLinesAdd?.userErrors;
        if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
        const cartData = res?.cartLinesAdd?.cart;
        finalCartId = cartData?.id ?? cartId;
        const total = cartData?.totalQuantity ?? 0;
        window.dispatchEvent(new CustomEvent('cart:updated', { detail: { totalQuantity: total } }));
      }

      window.dispatchEvent(new CustomEvent('cart:item-added'));

      for (const p of look.products) {
        trackAddToCart({
          productGid: p.id,
          variantGid: selections[p.id],
          productTitle: p.title,
          price: p.priceRange?.minVariantPrice?.amount ?? '0',
          cartId: finalCartId ?? '',
          quantity: 1,
        });
      }

      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (e) {
      alert(e?.message || 'Could not add set to cart.');
    } finally {
      setAdding(false);
    }
  };

  // ── States ─────────────────────────────────────────────────────────────────

  if (loading) return <LookPageSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <p className="montserrat-500 text-sm uppercase tracking-[0.12em] text-black/60">{error}</p>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="border border-black px-8 py-3 montserrat-600 text-xs uppercase tracking-[0.16em] hover:bg-black hover:text-white transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-black"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!look) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <p className="montserrat-500 text-sm uppercase tracking-[0.12em] text-black/60">
          Look not found
        </p>
        <Link
          href="/collections"
          className="border border-black px-8 py-3 montserrat-600 text-xs uppercase tracking-[0.16em] hover:bg-black hover:text-white transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-black"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  // ── Success layout ─────────────────────────────────────────────────────────

  const allHaveSize = look.products.every((p) => getSizeOption(p) !== null);

  return (
    <>
      <LookJsonLd look={look} />

      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr] gap-8 lg:gap-12">

          {/* Left — look image */}
          <div>
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={cdnImage(look.image.url, 1000)}
                srcSet={cdnSrcSet(look.image.url, [600, 900, 1200])}
                sizes="(max-width: 1024px) 100vw, 55vw"
                alt={look.image.altText || look.title}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>

          {/* Right — details */}
          <div className="flex flex-col gap-6">
            {/* Title + total */}
            <div>
              <h1 className="cormorant-garamond-700 text-3xl md:text-4xl uppercase tracking-[0.14em] leading-tight">
                {look.title}
              </h1>
              <p className="montserrat-500 text-base mt-2 tracking-[0.10em]">
                Set {totalStr}
              </p>
            </div>

            {/* Product preview grid */}
            <div className="grid grid-cols-2 gap-3">
              {look.products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.handle}`}
                  className="group block"
                >
                  <div className="aspect-[2/3] overflow-hidden bg-white">
                    <img
                      src={cdnImage(p.imageUrl, 300)}
                      srcSet={cdnSrcSet(p.imageUrl, [300, 480, 600])}
                      sizes="(max-width: 1024px) 45vw, 20vw"
                      alt={p.imageAlt}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <p className="montserrat-500 text-[10px] uppercase tracking-[0.10em] mt-1 line-clamp-2">
                    {p.title}
                  </p>
                  <p className="montserrat-600 text-[10px] mt-0.5">
                    {formatLookPrice(
                      p.priceRange?.minVariantPrice?.amount,
                      p.priceRange?.minVariantPrice?.currencyCode
                    )}
                  </p>
                </Link>
              ))}
            </div>

            {/* Shop the set — per-product size selectors */}
            <div>
              <p className="montserrat-700 text-xs uppercase tracking-[0.20em] mb-2">
                Shop the Set
              </p>
              <div className="divide-y divide-black/10 border-t border-black/10">
                {look.products.map((p) => (
                  <ProductSetRow
                    key={p.id}
                    product={p}
                    selectedVariantId={selections[p.id] ?? null}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>

            {/* Add set button */}
            <div className="mt-auto space-y-3">
              <button
                type="button"
                disabled={!canAddSet || adding}
                onClick={handleAddSet}
                className={[
                  'w-full h-14 flex items-center justify-center gap-2',
                  'montserrat-700 text-xs uppercase tracking-[0.20em] transition-colors',
                  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-black',
                  canAddSet && !adding
                    ? 'bg-black text-white hover:bg-black/80'
                    : 'bg-black/10 text-black/30 cursor-not-allowed',
                ].join(' ')}
              >
                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                {added
                  ? 'Added to Bag ✓'
                  : `Add Set to Bag — ${totalStr}`}
              </button>

              {!allHaveSize && !canAddSet && (
                <p className="montserrat-500 text-[10px] uppercase tracking-[0.10em] text-center text-black/50">
                  Select a size for every piece to add the set
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
