'use client';
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

const CATEGORY_SLIDES = [
  {
    id: 0,
    title: "Dresses",
    handle: "dresses",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/dresses-pc1.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/DRESSES-MOBILE1.jpg",
  },
  {
    id: 1,
    title: "Shirts",
    handle: "shirts",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/SHIRTS-PC1.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/SHIRTS-MOBILE1.jpg",
  },
  {
    id: 2,
    title: "Co-Ord Sets",
    handle: "all-co-ord-sets",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/COORD-SET-PC2.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/COORD-SET-MOBILE2.jpg",
  },
  {
    id: 3,
    title: "Denim Edit",
    handle: "denim-edit",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/denim_edits_pc.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/denim_edits_mobile.jpg",
  },
];

export default function CategoriesSectionNew() {
  const router = useRouter();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const containerRef = useRef(null);
  const centerCardRef = useRef(null);
  const pointerIdRef = useRef(null);
  const pointerTypeRef = useRef(null);
  const wasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastClientRef = useRef({ x: 0, y: 0 });
  // 'h' = locked horizontal, 'v' = locked vertical, null = undecided
  const directionRef = useRef(null);
  // Mirror of dragOffset state so event handlers always read the current value
  const dragOffsetRef = useRef(0);

  const len = CATEGORY_SLIDES.length;

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % len);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + len) % len);

  // After isDragging becomes false, animate dragOffset back to 0 in the next frame
  // so the transition class is restored first (avoiding an instant snap).
  useEffect(() => {
    if (!isDragging) {
      const id = requestAnimationFrame(() => {
        setDragOffset(0);
        dragOffsetRef.current = 0;
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isDragging]);

  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    pointerTypeRef.current = e.pointerType;
    wasDraggedRef.current = false;
    directionRef.current = null;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = 0;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (e) => {
    if (e.pointerId !== pointerIdRef.current) return;

    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    // Determine scroll direction on first significant movement
    if (directionRef.current === null && (Math.abs(diffX) > 6 || Math.abs(diffY) > 6)) {
      if (Math.abs(diffY) > Math.abs(diffX)) {
        // Vertical — release pointer and let page scroll; null pointer id so Up/Cancel are ignored
        directionRef.current = 'v';
        try { containerRef.current?.releasePointerCapture(e.pointerId); } catch { }
        pointerIdRef.current = null;
        setIsDragging(false);
        return;
      } else {
        // Horizontal — capture so the browser can't steal it for scrolling
        directionRef.current = 'h';
        try { containerRef.current?.setPointerCapture(e.pointerId); } catch { }
      }
    }

    if (directionRef.current !== 'h') return;

    if (Math.abs(diffX) > 6) {
      wasDraggedRef.current = true;
      if (e.cancelable) e.preventDefault();
    }

    dragOffsetRef.current = diffX;
    setDragOffset(diffX);
    lastClientRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    // Ignore if we have no tracked pointer (happens after vertical-scroll abandonment)
    if (pointerIdRef.current == null || e.pointerId !== pointerIdRef.current) return;
    try { containerRef.current?.releasePointerCapture(e.pointerId); } catch { }

    const offset = dragOffsetRef.current;
    const threshold = 75;

    if (offset > threshold) prevSlide();
    else if (offset < -threshold) nextSlide();
    else if (!wasDraggedRef.current) {
      // Genuine tap — navigate to the category
      const { x, y } = lastClientRef.current;
      const clickedEl = document.elementFromPoint(x, y);
      const cardEl = clickedEl?.closest("[data-handle]");
      const handle = cardEl?.getAttribute("data-handle");
      if (handle) router.push(`/collections/${handle}`);
    }

    setIsDragging(false);
    pointerIdRef.current = null;
    directionRef.current = null;

    if (wasDraggedRef.current) {
      setTimeout(() => {
        wasDraggedRef.current = false;
        pointerTypeRef.current = null;
      }, 220);
    } else {
      pointerTypeRef.current = null;
      wasDraggedRef.current = false;
    }
  };

  // pointercancel = browser took over (native scroll, phone call, etc.) — only clean up, never navigate
  const handlePointerCancel = (e) => {
    if (pointerIdRef.current == null || e.pointerId !== pointerIdRef.current) return;
    try { containerRef.current?.releasePointerCapture(e.pointerId); } catch { }
    setIsDragging(false);
    dragOffsetRef.current = 0;
    pointerIdRef.current = null;
    directionRef.current = null;
    wasDraggedRef.current = false;
    pointerTypeRef.current = null;
  };

  const getSlidePosition = (slideId) => {
    const diff = (((slideId - currentSlide) % len) + len) % len;
    if (diff === 0) return "center";
    if (diff === 1) return "right";
    if (diff === len - 1) return "left";
    return "hidden";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const handle = CATEGORY_SLIDES[currentSlide]?.handle;
      if (handle) router.push(`/collections/${handle}`);
    }
  };

  return (
    <section className="w-full bg-white px-3 pt-6 pb-6 md:px-[5%] md:pt-10 md:pb-10 overflow-hidden">
      <SectionHeader
        title="CATEGORIES"
        subtitle="Shop by your mood & moment"
        className="relative z-20 mb-6 md:mb-8"
      />

      <div className="w-full flex items-center justify-center px-4 pt-16 pb-6 md:px-0 md:py-10 lg:py-12">
        <div className="w-full max-w-[1800px]">
          <div className="relative">
            <div className="flex items-center gap-3 md:gap-6 lg:gap-8">

              {/* Left Arrow */}
              <button
                onClick={prevSlide}
                className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-primary text-white shadow-lg md:shadow-xl hidden [@media(min-width:1400px)]:flex items-center justify-center hover:scale-110 transition-all duration-300 z-30"
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
                  cursor: isDragging && directionRef.current === 'h' ? "grabbing" : "grab",
                  // pan-y: browser owns vertical scroll; we handle horizontal
                  touchAction: "pan-y",
                  userSelect: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {CATEGORY_SLIDES.map((slide) => {
                    const position = getSlidePosition(slide.id);
                    const isCenter = position === "center";
                    const isActive = isDragging && directionRef.current === 'h';

                    return (
                      <div
                        key={slide.id}
                        className={`absolute ${isActive ? "transition-none" : "transition-all duration-700 ease-in-out"} ${
                          isCenter
                            ? "w-[90%] sm:w-[35%] md:w-[45%] lg:w-[45%] h-90 sm:h-80 md:h-90 lg:h-100 opacity-100 scale-100 z-20"
                            : position === "left" || position === "right"
                            ? "w-[40%] sm:w-[35%] md:w-[32%] lg:w-[38%] h-48 sm:h-56 md:h-64 lg:h-80 scale-90 z-10"
                            : "w-[30%] h-48 opacity-0 scale-75 pointer-events-none"
                        }`}
                        style={{
                          filter: isCenter ? "none" : "blur(0.5px)",
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
                          className={`block h-full cursor-pointer rounded-xl overflow-hidden ${
                            isCenter ? "shadow-xl md:shadow-2xl" : "shadow-md"
                          }`}
                          onKeyDown={isCenter ? handleKeyDown : undefined}
                        >
                          <div className="relative h-full w-full">
                            <picture>
                              <source media="(max-width: 768px)" srcSet={slide.imageMobile} />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={slide.image}
                                alt={slide.title}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover object-center"
                                draggable="false"
                              />
                            </picture>
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
                className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-primary text-white shadow-lg md:shadow-xl hidden [@media(min-width:1400px)]:flex items-center justify-center hover:scale-110 transition-all duration-300 z-30"
                aria-label="Next slide"
                type="button"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
              </button>
            </div>

            {/* Progress dots */}
            <div className="mt-8 flex justify-center gap-2 md:mt-8 md:gap-3 lg:mt-10">
              {CATEGORY_SLIDES.map((slide) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlide(slide.id)}
                  className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${
                    slide.id === currentSlide
                      ? "w-10 md:w-12 lg:w-16 bg-primary"
                      : "w-6 md:w-8 lg:w-10 bg-neutral-300 hover:bg-neutral-400"
                  }`}
                  aria-label={`Go to ${slide.title}`}
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
