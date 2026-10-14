'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

/** 
 * Static Category Slides 
 * Images are uploaded to Shopify -> Content -> Files
 */
const CATEGORY_SLIDES = [
  {
    id: 0,

    title: "Dresses",
    handle: "dresses",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/dresses-pc1.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/DRESSES-MOBILE1.jpg"
  },
  {
    id: 1,

    title: "Shirts",
    handle: "shirts",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/SHIRTS-PC1.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/SHIRTS-MOBILE1.jpg"

  },
  {
    id: 2,
    title: "Co-Ord Sets",
    handle: "all-co-ord-sets",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/COORD-SET-PC2.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/COORD-SET-MOBILE2.jpg"
  },
  {
    id: 3,
    title: "Denim Edit",
    handle: "denim-edit",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/denim_edits_pc.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/denim_edits_mobile.jpg"
  }
];

export default function CategoriesSection() {
  const router = useRouter();

  const [slides] = useState(CATEGORY_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const containerRef = useRef(null);
  const centerCardRef = useRef(null);
  const pointerIdRef = useRef(null);
  const pointerTypeRef = useRef(null);
  const wasDraggedRef = useRef(false);
  const finalDragOffsetRef = useRef(0);
  const lastClientRef = useRef({ x: 0, y: 0 });

  /* ---------------- Carousel Logic ---------------- */
  const nextSlide = () => setCurrentSlide((p) => (p + 1) % (slides.length || 1));
  const prevSlide = () =>
    setCurrentSlide((p) => (p - 1 + (slides.length || 1)) % (slides.length || 1));

  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (containerRef.current?.setPointerCapture) {
      try {
        containerRef.current.setPointerCapture(e.pointerId);
      } catch { }
    }
    pointerIdRef.current = e.pointerId;
    pointerTypeRef.current = e.pointerType;
    wasDraggedRef.current = false;
    finalDragOffsetRef.current = 0;

    setIsDragging(true);
    setStartX(e.clientX);
    setDragOffset(0);
    lastClientRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || e.pointerId !== pointerIdRef.current) return;
    const diff = e.clientX - startX;
    setDragOffset(diff);
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    if (Math.abs(diff) > 6) {
      wasDraggedRef.current = true;
      if (e.cancelable) e.preventDefault();
    }
  };

  const handlePointerUpOrCancel = (e) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    if (containerRef.current?.releasePointerCapture) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch { }
    }

    const threshold = 75;
    finalDragOffsetRef.current = dragOffset;

    if (dragOffset > threshold) prevSlide();
    else if (dragOffset < -threshold) nextSlide();
    else {
      if (
        !wasDraggedRef.current &&
        Math.abs(finalDragOffsetRef.current) <= (pointerTypeRef.current === "mouse" ? 12 : 10)
      ) {
        // Detect which slide was clicked using data-handle
        const { x, y } = lastClientRef.current;
        const clickedEl = document.elementFromPoint(x, y);
        const cardEl = clickedEl?.closest("[data-handle]");
        const handle = cardEl?.getAttribute("data-handle");

        if (handle) {
          router.push(`/collections/${handle}`);
        }
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    setStartX(0);
    pointerIdRef.current = null;

    if (wasDraggedRef.current) {
      setTimeout(() => {
        wasDraggedRef.current = false;
        finalDragOffsetRef.current = 0;
        pointerTypeRef.current = null;
      }, 220);
    } else {
      pointerTypeRef.current = null;
      finalDragOffsetRef.current = 0;
    }
  };

  const getSlidePosition = (slideId) => {
    const len = slides.length;
    if (!len) return "hidden";
    const diff = (((slideId - currentSlide) % len) + len) % len;
    if (diff === 0) return "center";
    if (diff === 1) return "right";
    if (diff === len - 1) return "left";
    return "hidden";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const handle = slides[currentSlide]?.handle;
      if (handle) router.push(`/collections/${handle}`);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <section className="w-full bg-white px-3 pt-6 pb-6 md:px-[5%] md:pt-10 md:pb-10 overflow-hidden">
      <SectionHeader
        title="CATEGORIES"
        subtitle="Dresses, Co-ords, Shirts, Denim — every silhouette, curated."
        className="relative z-20 mb-6 md:mb-8"
      />

      {/* Carousel */}
      <div className="w-full flex items-center justify-center px-4 pt-16 pb-6 md:px-0 md:py-10 lg:py-12">
        <div className="w-full max-w-[1800px]">
          <div className="relative">
            <div className="flex items-center gap-3 md:gap-6 lg:gap-8">
              {/* Left Arrow */}
              <button
                onClick={prevSlide}
                className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-primary text-white shadow-lg md:shadow-xl flex items-center justify-center hover:bg-primary hover:scale-110 transition-all duration-300 z-30"
                aria-label="Previous slide"
                type="button"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
              </button>

              {/* Slides */}
              <div
                ref={containerRef}
                className="flex-1 relative h-64 sm:h-72 md:h-80 lg:h-90 overflow-visible select-none"
                style={{
                  cursor: isDragging ? "grabbing" : "grab",
                  touchAction: "none",
                  userSelect: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrCancel}
                onPointerCancel={handlePointerUpOrCancel}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {slides.map((slide) => {
                    const position = getSlidePosition(slide.id);
                    const isCenter = position === "center";

                    return (
                      <div
                        key={slide.id}
                        className={`absolute ${isDragging ? "transition-none" : "transition-all duration-700 ease-in-out"
                          }
                        ${isCenter
                            ? "w-[90%] sm:w-[35%] md:w-[45%] lg:w-[45%] h-90 sm:h-80 md:h-90 lg:h-100 opacity-100 scale-100 z-20"
                            : position === "left"
                              ? "w-[40%] sm:w-[35%] md:w-[32%] lg:w-[38%] h-48 sm:h-56 md:h-64 lg:h-80 scale-90 z-10"
                              : position === "right"
                                ? "w-[40%] sm:w-[35%] md:w-[32%] lg:w-[38%] h-48 sm:h-56 md:h-64 lg:h-80 scale-90 z-10"
                                : "w-[30%] h-48 opacity-0 scale-75 pointer-events-none"
                          }`}
                        style={{
                          filter: isCenter ? "none" : "blur(0.5px) md:blur(1px)",
                          transform: isCenter
                            ? `translateX(${dragOffset}px)`
                            : position === "left"
                              ? `translateX(calc(-100% - 1rem + ${dragOffset}px)) scale(0.9)`
                              : position === "right"
                                ? `translateX(calc(100% + 1rem + ${dragOffset}px)) scale(0.9)`
                                : undefined,
                        }}
                      >
                        <div
                          ref={isCenter ? centerCardRef : null}
                          role="link"
                          tabIndex={isCenter ? 0 : -1}
                          aria-label={slide.title}
                          data-handle={slide.handle}
                          className={`block h-full cursor-pointer rounded-xl overflow-hidden ${isCenter
                            ? "bg-white shadow-xl md:shadow-2xl"
                            : "bg-white shadow-md md:shadow-lg"
                            }`}
                          onKeyDown={isCenter ? handleKeyDown : undefined}
                        >
                          <div className="relative h-full w-full">
                            <Image
                              src={slide.image}
                              alt={slide.title}
                              fill
                              className="object-cover object-center transition-all duration-700"
                              draggable="false"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-12 md:h-16 bg-gradient-to-t from-primary/20 to-transparent" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Arrow */}
              <button
                onClick={nextSlide}
                className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-primary text-white shadow-lg md:shadow-xl flex items-center justify-center hover:bg-primary hover:scale-110 transition-all duration-300 z-30"
                aria-label="Next slide"
                type="button"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="mt-8 flex justify-center gap-2 md:mt-8 md:gap-3 lg:mt-10">
              {slides.map((slide) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlide(slide.id)}
                  className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${slide.id === currentSlide
                    ? "w-10 md:w-12 lg:w-16 bg-primary"
                    : "w-6 md:w-8 lg:w-10 bg-gray-300 hover:bg-gray-400"
                    }`}
                  aria-label={`Go to slide ${slide.id + 1}`}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
