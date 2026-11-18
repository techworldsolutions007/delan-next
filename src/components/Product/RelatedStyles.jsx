'use client';
import React from 'react';
import ProductCard from './ProductCard';

function normalise(p) {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    imageUrl: p.featuredImage?.url ?? '',
    altText: p.featuredImage?.altText || p.title,
    secondImageUrl: null,
    price: p.priceRange?.minVariantPrice?.amount ?? '0',
    currency: p.priceRange?.minVariantPrice?.currencyCode ?? 'INR',
    available: true,
    variantCount: 1,
  };
}

/**
 * embedded=true  → compact inline variant (inside the PDP right column)
 * embedded=false → full-width section variant (standalone page section)
 */
export default function RelatedStyles({ products, title = 'Pair It With', embedded = false }) {
  if (!products?.length) return null;

  const cards = products.map(normalise);

  if (embedded) {
    return (
      <div className="w-full">
        <h2 className="cormorant-garamond-700 uppercase text-primary text-2xl mb-4 text-left">
          {title}
        </h2>
        <div
          className="grid gap-3 overflow-x-auto pb-2 no-scrollbar"
          style={{ gridTemplateColumns: `repeat(${cards.length}, 140px)` }}
        >
          {cards.map((product, index) => (
            <div key={product.id} className="min-w-0">
              <ProductCard
                product={product}
                eager={index < 2}
                showWishlistButton={false}
                showPrice
                showBottomAddToCartButton={false}
                showDesktopHoverQuickAdd={false}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-[5%]">
        <h2 className="cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-5 sm:mb-8 text-left">
          {title}
        </h2>
      </div>
      <div
        className="grid gap-3 sm:gap-4 overflow-x-auto px-[5%] pb-3 no-scrollbar"
        style={{ gridTemplateColumns: `repeat(${cards.length}, 220px)` }}
      >
        {cards.map((product, index) => (
          <div key={product.id} className="min-w-0">
            <ProductCard
              product={product}
              eager={index < 2}
              showWishlistButton={false}
              showPrice
              showBottomAddToCartButton={false}
              showDesktopHoverQuickAdd={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
