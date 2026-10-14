'use client';
import { useRouter } from 'next/navigation';
import React from "react";

export default function RelatedStyles({ products }) {
  const router = useRouter();

  if (!products?.length) return null;

  return (
    <div className="w-full">
      {/* Decorative header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-black/10" />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40 montserrat-600 shrink-0">
          Also Available As
        </p>
        <div className="flex-1 h-px bg-black/10" />
      </div>

      {/* Single row blocks */}
      <div className="flex flex-row gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {products.map((p) => {
          const image = p.featuredImage?.url;
          const alt = p.featuredImage?.altText || p.title;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`/products/${p.handle}`)}
              className="group flex flex-col items-center gap-2 shrink-0"
            >
              {/* Square block */}
              <div className="h-[80px] w-[80px] overflow-hidden rounded-full border border-black/[0.08] bg-neutral-100 transition-all duration-200 group-hover:border-black/20 group-hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)] group-active:scale-[0.96]">
                {image ? (
                  <img
                    src={image}
                    alt={alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-200" />
                )}
              </div>

              {/* Title */}
              <p className="w-[80px] text-center text-[10px] font-bold uppercase tracking-[0.08em] text-black/60 montserrat-600 leading-tight line-clamp-2">
                {p.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
