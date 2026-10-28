'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    id: 0,
    title: "Dresses",
    subtitle: "Effortless style, every day.",
    handle: "dresses",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/dresses-pc1.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/DRESSES-MOBILE1.jpg",
  },
  {
    id: 1,
    title: "Shirts",
    subtitle: "Sharp looks, seamless fit.",
    handle: "shirts",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/SHIRTS-PC1.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/SHIRTS-MOBILE1.jpg",
  },
  {
    id: 2,
    title: "Co-Ord un",
    subtitle: "Matched, styled, ready.",
    handle: "all-co-ord-sets",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/COORD-SET-PC2.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/COORD-SET-MOBILE2.jpg",
  },
  {
    id: 3,
    title: "Denim Edit",
    subtitle: "Classic denim, bold edge.",
    handle: "denim-edit",
    image: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/denim_edits_pc.jpg",
    imageMobile: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/denim_edits_mobile.jpg",
  },
];

const CLONE_COUNT = 3;
const n = SLIDES.length;
const EXTENDED = [
  ...SLIDES.slice(-CLONE_COUNT),
  ...SLIDES,
  ...SLIDES.slice(0, CLONE_COUNT),
];

function getVisibleCount() {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth < 768) return 1;
  if (window.innerWidth < 1024) return 2;
  return 3;
}

function getSliderHeight(vc) {
  if (vc === 1) return '150vw';
  if (vc === 2) return '56vw';
  return '43.75vw';
}

export default function CategoriesSection() {
  const [visibleCount, setVisibleCount] = useState(null);
  const [idx, setIdx] = useState(CLONE_COUNT);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    const update = () => setVisibleCount(getVisibleCount());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const startAutoSlide = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTransitioning(true);
      setIdx((prev) => prev + 1);
    }, 4500);
  };

  useEffect(() => {
    startAutoSlide();
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    setTransitioning(true);
    setIdx((prev) => prev + 1);
    startAutoSlide();
  };

  const handlePrev = () => {
    setTransitioning(true);
    setIdx((prev) => prev - 1);
    startAutoSlide();
  };

  const handleDotClick = (i) => {
    setTransitioning(true);
    setIdx(CLONE_COUNT + i);
    startAutoSlide();
  };

  const handleTransitionEnd = () => {
    setTransitioning(false);
    if (idx >= CLONE_COUNT + n) {
      setIdx(idx - n);
    } else if (idx < CLONE_COUNT) {
      setIdx(idx + n);
    }
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  // Show CSS-driven skeleton until JS determines screen width — prevents blank flash on mobile
  if (visibleCount === null) {
    return (
      <section className="w-full pt-10 md:pt-14">
        <div className="w-full bg-neutral-100 animate-pulse h-[150vw] md:h-[56vw] lg:h-[43.75vw]" />
      </section>
    );
  }

  const offset = -(idx / EXTENDED.length) * 100;
  const containerWidthPct = (EXTENDED.length / visibleCount) * 100;
  const height = getSliderHeight(visibleCount);
  const activeDot = ((idx - CLONE_COUNT) % n + n) % n;

  return (
    <section className="w-full pt-10 md:pt-14">
      {/* Slider */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            width: `${containerWidthPct}%`,
            transform: `translateX(${offset}%)`,
            transition: transitioning ? 'transform 900ms ease-in-out' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {EXTENDED.map((slide, i) => (
            <div
              key={`${slide.id}-${i}`}
              className="relative h-full flex-shrink-0"
              style={{ width: `${100 / EXTENDED.length}%` }}
            >
              <Link
                href={`/collections/${slide.handle}`}
                className="block h-full w-full relative group overflow-hidden rounded-none"
                draggable="false"
              >
                {/* Mobile image — hidden on md+ */}
                <Image
                  src={slide.imageMobile || slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03] md:hidden"
                  draggable="false"
                  priority={i >= CLONE_COUNT && i < CLONE_COUNT + n}
                />
                {/* Desktop image — hidden below md */}
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03] hidden md:block"
                  draggable="false"
                  priority={i >= CLONE_COUNT && i < CLONE_COUNT + n}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent pt-14 pb-5 px-5 z-10">
                  <span className="text-white text-xs font-bold tracking-[0.16em] uppercase drop-shadow-sm">
                    {slide.title}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Arrows: desktop only */}
        <button
          onClick={handlePrev}
          aria-label="Previous category"
          className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/55 text-white items-center justify-center backdrop-blur-sm transition-all duration-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          aria-label="Next category"
          className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/55 text-white items-center justify-center backdrop-blur-sm transition-all duration-200"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Line indicators — bottom-right, overlaid on image */}
        <div className="absolute bottom-5 right-4 z-20 flex items-center gap-1.5">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => handleDotClick(i)}
              aria-label={`Go to ${slide.title}`}
              className={`block rounded-full transition-all duration-300 h-[2px] ${
                i === activeDot
                  ? 'w-7 bg-white'
                  : 'w-3.5 bg-white/40 hover:bg-white/65'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
