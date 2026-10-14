'use client';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  cdnImage,
  cdnSrcSet,
  formatLookPrice,
  sumLookMinPrices,
} from '@/lib/looks';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

// ── Icons ────────────────────────────────────────────────────────────────────

function EditorialIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="0" y="1" width="24" height="5" />
      <rect x="0" y="9" width="24" height="5" />
      <rect x="0" y="17" width="24" height="5" />
    </svg>
  );
}

function CompactIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="0" y="0" width="10" height="10" />
      <rect x="14" y="0" width="10" height="10" />
      <rect x="0" y="14" width="10" height="10" />
      <rect x="14" y="14" width="10" height="10" />
    </svg>
  );
}

// ── QuickAddButton ───────────────────────────────────────────────────────────

function QuickAddButton({ product, onClick }) {
  const isOOS = !product.availableForSale;
  return (
    <button
      type="button"
      disabled={isOOS}
      title={isOOS ? 'Out of stock' : 'Quick add'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isOOS) onClick();
      }}
      className={[
        'w-8 h-8 flex items-center justify-center text-lg leading-none border transition-colors',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-black',
        isOOS
          ? 'border-black/30 text-black/30 cursor-not-allowed'
          : 'border-black bg-white text-black hover:bg-black hover:text-white',
      ].join(' ')}
    >
      +
    </button>
  );
}

// ── Product cards ────────────────────────────────────────────────────────────

function EditorialProductCard({ product, onQuickAdd, eager }) {
  const priceStr = formatLookPrice(
    product.priceRange?.minVariantPrice?.amount,
    product.priceRange?.minVariantPrice?.currencyCode,
  );

  return (
    <div className="group relative">
      <Link href={`/products/${product.handle}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden bg-white">
          <img
            src={cdnImage(product.imageUrl, 480)}
            srcSet={cdnSrcSet(product.imageUrl, [300, 480, 600, 800])}
            sizes="(max-width: 1024px) 45vw, 20vw"
            alt={product.imageAlt}
            className="w-full h-full object-contain"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
          />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
            <QuickAddButton product={product} onClick={() => onQuickAdd(product)} />
          </div>
        </div>
        <div className="mt-2 flex items-start justify-between gap-2">
          <p className="montserrat-500 text-xs uppercase tracking-[0.12em] line-clamp-2 flex-1">
            {product.title}
          </p>
          <p className="montserrat-600 text-xs whitespace-nowrap">{priceStr}</p>
        </div>
      </Link>
      <div className="mt-1 flex justify-end lg:hidden">
        <QuickAddButton product={product} onClick={() => onQuickAdd(product)} />
      </div>
    </div>
  );
}

function CompactProductCard({ product, onQuickAdd, eager }) {
  const priceStr = formatLookPrice(
    product.priceRange?.minVariantPrice?.amount,
    product.priceRange?.minVariantPrice?.currencyCode,
  );

  return (
    <div className="group">
      <Link href={`/products/${product.handle}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden bg-white">
          <img
            src={cdnImage(product.imageUrl, 300)}
            srcSet={cdnSrcSet(product.imageUrl, [300, 480, 600, 800])}
            sizes="12vw"
            alt={product.imageAlt}
            className="w-full h-full object-contain"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
          />
        </div>
      </Link>
      <div className="mt-1 flex items-center justify-center gap-2">
        <p className="montserrat-600 text-[10px] uppercase tracking-[0.10em]">{priceStr}</p>
        <QuickAddButton product={product} onClick={() => onQuickAdd(product)} />
      </div>
    </div>
  );
}

function MobileProductCard({ product, onQuickAdd, eager }) {
  const priceStr = formatLookPrice(
    product.priceRange?.minVariantPrice?.amount,
    product.priceRange?.minVariantPrice?.currencyCode,
  );

  return (
    <div>
      <Link href={`/products/${product.handle}`} className="block">
        <div className="aspect-[2/3] overflow-hidden bg-white">
          <img
            src={cdnImage(product.imageUrl, 480)}
            srcSet={cdnSrcSet(product.imageUrl, [300, 480, 600, 800])}
            sizes="45vw"
            alt={product.imageAlt}
            className="w-full h-full object-contain"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
          />
        </div>
        <div className="mt-2 flex items-start justify-between gap-2">
          <p className="montserrat-500 text-xs uppercase tracking-[0.12em] line-clamp-2 flex-1">
            {product.title}
          </p>
          <p className="montserrat-600 text-xs whitespace-nowrap">{priceStr}</p>
        </div>
      </Link>
      <div className="mt-1 flex justify-end">
        <QuickAddButton product={product} onClick={() => onQuickAdd(product)} />
      </div>
    </div>
  );
}

// ── Look rows ────────────────────────────────────────────────────────────────

function EditorialLookRow({ look, onQuickAdd, eager }) {
  const { amount, currency } = sumLookMinPrices(look);
  const totalStr = formatLookPrice(amount, currency);

  return (
    <div className="flex gap-6 py-10 border-b border-black/15">
      {/* Look image — 45% */}
      <div className="w-[45%] flex-shrink-0">
        <Link href={`/looks/${look.handle}`} className="block">
          <div className="aspect-[3/4] overflow-hidden">
            <img
              src={cdnImage(look.image.url, 800)}
              srcSet={cdnSrcSet(look.image.url, [400, 800, 1200])}
              sizes="45vw"
              alt={look.image.altText || look.title}
              className="w-full h-full object-cover"
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
            />
          </div>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <Link href={`/looks/${look.handle}`}>
            <p className="cormorant-garamond-700 text-lg uppercase tracking-[0.14em]">
              {look.title}
            </p>
          </Link>
          <p className="montserrat-500 text-sm tracking-[0.10em]">{totalStr}</p>
        </div>
      </div>

      {/* Product grid — 55%, 2 columns */}
      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-6 content-start pt-2">
        {look.products.map((product, i) => (
          <EditorialProductCard
            key={product.id}
            product={product}
            onQuickAdd={onQuickAdd}
            eager={eager && i === 0}
          />
        ))}
      </div>
    </div>
  );
}

function CompactLookCell({ look, onQuickAdd, eager }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Look image — 1/3 */}
      <div className="col-span-1">
        <Link href={`/looks/${look.handle}`} className="block">
          <div className="aspect-[3/4] overflow-hidden">
            <img
              src={cdnImage(look.image.url, 480)}
              srcSet={cdnSrcSet(look.image.url, [400, 800, 1200])}
              sizes="20vw"
              alt={look.image.altText || look.title}
              className="w-full h-full object-cover"
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
            />
          </div>
        </Link>
        <Link href={`/looks/${look.handle}`}>
          <p className="mt-2 montserrat-500 text-[10px] uppercase tracking-[0.12em] line-clamp-2">
            {look.title}
          </p>
        </Link>
      </div>

      {/* Products — 2/3, 2-col */}
      <div className="col-span-2 grid grid-cols-2 gap-2">
        {look.products.map((product, i) => (
          <CompactProductCard
            key={product.id}
            product={product}
            onQuickAdd={onQuickAdd}
            eager={eager && i === 0}
          />
        ))}
      </div>
    </div>
  );
}

function MobileLookSection({ look, onQuickAdd, eager }) {
  const { amount, currency } = sumLookMinPrices(look);
  const totalStr = formatLookPrice(amount, currency);

  return (
    <div className="pb-10 border-b border-black/15">
      {/* Full-width look image */}
      <Link href={`/looks/${look.handle}`} className="block">
        <div className="aspect-[3/4] w-full overflow-hidden">
          <img
            src={cdnImage(look.image.url, 800)}
            srcSet={cdnSrcSet(look.image.url, [400, 800, 1200])}
            sizes="100vw"
            alt={look.image.altText || look.title}
            className="w-full h-full object-cover"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
          />
        </div>
      </Link>
      <div className="px-4 mt-3 flex items-center justify-between">
        <Link href={`/looks/${look.handle}`}>
          <p className="cormorant-garamond-700 text-base uppercase tracking-[0.14em]">
            {look.title}
          </p>
        </Link>
        <p className="montserrat-500 text-sm">{totalStr}</p>
      </div>

      {/* 2-col product grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
        {look.products.map((product, i) => (
          <MobileProductCard
            key={product.id}
            product={product}
            onQuickAdd={onQuickAdd}
            eager={eager && i === 0}
          />
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function LookCollectionSkeleton() {
  return (
    <div className="space-y-0">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-6 py-10 border-b border-black/15 animate-pulse">
          <div className="w-[45%] flex-shrink-0 bg-black/10 aspect-[3/4]" />
          <div className="flex-1 grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="space-y-2">
                <div className="bg-black/10 aspect-[2/3]" />
                <div className="h-3 bg-black/10 w-3/4" />
                <div className="h-3 bg-black/10 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────

function LookCollectionJsonLd({ looks }) {
  const items = looks.flatMap((look, li) =>
    look.products.map((p, pi) => ({
      '@type': 'ListItem',
      position: li * 6 + pi + 1,
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
    }))
  );

  const jsonLd = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function LookCollection({ looks = [], onQuickAdd = () => {} }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const view = searchParams.get('view') === 'compact' ? 'compact' : 'editorial';

  const setView = (v) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', v);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (!looks.length) return null;

  return (
    <section className="w-full">
      {/* View toggle — desktop only */}
      <div className="hidden lg:flex items-center justify-end gap-1 px-4 md:px-8 pb-4 max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => setView('editorial')}
          aria-label="Editorial view"
          aria-pressed={view === 'editorial'}
          className={[
            'w-9 h-9 flex items-center justify-center border transition-colors',
            'focus-visible:outline focus-visible:outline-1 focus-visible:outline-black',
            view === 'editorial'
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-black hover:bg-black hover:text-white',
          ].join(' ')}
        >
          <EditorialIcon />
        </button>
        <button
          type="button"
          onClick={() => setView('compact')}
          aria-label="Compact view"
          aria-pressed={view === 'compact'}
          className={[
            'w-9 h-9 flex items-center justify-center border transition-colors',
            'focus-visible:outline focus-visible:outline-1 focus-visible:outline-black',
            view === 'compact'
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-black hover:bg-black hover:text-white',
          ].join(' ')}
        >
          <CompactIcon />
        </button>
      </div>

      {/* Desktop editorial — one per row */}
      {view === 'editorial' && (
        <div className="hidden lg:block mx-auto max-w-7xl px-4 md:px-8">
          {looks.map((look, i) => (
            <EditorialLookRow
              key={look.id}
              look={look}
              onQuickAdd={onQuickAdd}
              eager={i === 0}
            />
          ))}
        </div>
      )}

      {/* Desktop compact — two per row */}
      {view === 'compact' && (
        <div className="hidden lg:grid grid-cols-2 gap-x-6 gap-y-10 mx-auto max-w-7xl px-4 md:px-8">
          {looks.map((look, i) => (
            <CompactLookCell
              key={look.id}
              look={look}
              onQuickAdd={onQuickAdd}
              eager={i === 0}
            />
          ))}
        </div>
      )}

      {/* Mobile — always full-width stacked */}
      <div className="lg:hidden space-y-0">
        {looks.map((look, i) => (
          <MobileLookSection
            key={look.id}
            look={look}
            onQuickAdd={onQuickAdd}
            eager={i === 0}
          />
        ))}
      </div>

      <LookCollectionJsonLd looks={looks} />
    </section>
  );
}
