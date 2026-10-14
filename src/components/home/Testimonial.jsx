'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

/* ---------- UI bits ---------- */
function Stars({ value = 0, size = 20 }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  const h = Math.ceil(size * 1.05);
  return (
    <div
      className="leading-none text-[#f5a623]"
      style={{ fontSize: `${size}px`, height: `${h}px` }}
      aria-label={`${v} out of 5 stars`}
    >
      {"★".repeat(v)}
      {"☆".repeat(5 - v)}
    </div>
  );
}

/* ---------- Flip Card ---------- */
function ReviewFlipCard({ t }) {
  const initials =
    (t.author || "User")
      .split(" ")
      .slice(0, 3)
      .map((s) => s?.[0]?.toUpperCase())
      .join("") || "U";

  const [flipped, setFlipped] = useState(false);

  const toggleFlip = useCallback(() => setFlipped((f) => !f), []);
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFlip();
      } else if (e.key === "Escape") {
        setFlipped(false);
      }
    },
    [toggleFlip]
  );
  const onBlur = useCallback(() => setFlipped(false), []);

  return (
    <div className="[perspective:1200px] h-[500px]" aria-live="polite">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? "Show review details" : "Flip to see product image"}
        onClick={toggleFlip}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className="relative h-full w-full transition-transform duration-500 select-none [transform-style:preserve-3d] will-change-transform"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* FRONT */}
        <Card
          className="absolute inset-0 rounded-2xl [backface-visibility:hidden] overflow-hidden"
          aria-hidden={flipped}
        >
          <CardContent className="p-5 sm:p-6 h-full text-center flex flex-col items-center">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-[color:var(--brand-642, #642c44)]/10 mb-3 sm:mb-4">
              <AvatarImage
                src={t.productImage}
                alt={t.author}
                className="h-full w-full object-cover object-center"
              />
              <AvatarFallback className="bg-[color:var(--brand-642, #642c44)]/10 text-[color:var(--brand-642, #642c44)] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 mb-1.5 sm:mb-2">
              <p className="montserrat-500 font-semibold text-neutral-900 leading-tight text-base sm:text-lg md:text-xl lg:text-xl truncate">
                {t.author}
              </p>
              {t.productTitle ? (
                <p className="montserrat-500 text-neutral-500 leading-tight text-sm whitespace-normal break-words">
                  for {t.productTitle}
                </p>
              ) : null}
            </div>

            <div className="mt-1 sm:mt-2">
              <span className="sm:hidden block">
                <Stars value={t.rating} size={18} />
              </span>
              <span className="hidden sm:block">
                <Stars value={t.rating} size={20} />
              </span>
            </div>

            <blockquote className="montserrat-500 mt-3 sm:mt-4 max-w-[70ch] w-full flex-1 [overflow-wrap:anywhere] [hyphens:auto] text-[1.2rem] leading-relaxed sm:text-[0.9rem] sm:leading-relaxed md:text-[1rem] md:leading-relaxed xl:text-[1.15rem] xl:leading-relaxed text-neutral-800 overflow-hidden">
              <span className="select-none text-[color:var(--brand-642, #642c44)] mr-1">“</span>
              {t.reviewText}
              <span className="select-none text-[color:var(--brand-642, #642c44)] ml-1">”</span>
            </blockquote>
          </CardContent>
        </Card>

        {/* BACK */}
        <Card
          className="absolute inset-0 rounded-2xl overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden] py-0!"
          aria-hidden={!flipped}
        >
          <CardContent className="p-0 h-full w-full">
            <div className="relative h-full w-full">
              <Image
                src={t.productImage}
                alt={t.productTitle || "Product"}
                fill
                className="object-cover object-top"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function TestimonialWomenDummy() {
  const autoplay = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
    })
  );

  const items = useMemo(
    () => [
      {
        id: "p-1",
        author: "Dia Ajmera",
        rating: 4,
        productTitle: "Tiger Printed Shirt",
        reviewText:
          "This shirt is a total show-stopper. The print looks premium and the fit sits perfectly on the shoulders. I styled it with jeans and everyone asked where it’s from.",
        productImage:
          "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/1.webp?v=1766656989",
      },
      {
        id: "p-2",
        author: "Sakshi Verma",
        rating: 5,
        productTitle: "Satin Midi Dress",
        reviewText:
          "The satin feels so smooth and luxe. It drapes beautifully and looks super elegant in photos. Wore it for a dinner date instant confidence boost.",
        productImage:
          "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/6.webp?v=1766656989",
      },
      {
        id: "p-3",
        author: "Riya",
        rating: 4,
        productTitle: "Solid Co-ord Set",
        reviewText:
          "Perfect everyday-to-evening set. The fabric doesn’t feel flimsy at all, and the stitching is clean. I love that it looks put-together with zero effort.",
        productImage:
          "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/5.webp?v=1766656989",
      },
      {
        id: "p-4",
        author: "Aditi Verma",
        rating: 5,
        productTitle: "Satin Shirt",
        reviewText:
          "Honestly surprised by the quality. It’s lightweight, soft, and gives that rich satin shine without looking loud. Perfect for office + weekend both.",
        productImage:
          "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/2.webp?v=1766656989",
      },
      {
        id: "p-5",
        author: "Avni Singh",
        rating: 4,
        productTitle: "Co-ords Set",
        reviewText:
          "So flattering and comfortable! I wore it for a small party and it looked very expensive. The fit is on point and the overall look is super stylish.",
        productImage:
          "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/4.webp?v=1766656989",
      },
      {
        id: "p-6",
        author: "Priyanka Yadav",
        rating: 4,
        productTitle: "Floral Mini Dress",
        reviewText:
          "This mini dress is adorable. The floral print is pretty, the fit is flattering, and it’s very comfy to wear for long hours. Perfect for day outings and vacations.",
        productImage:
          "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/3.webp?v=1766656989",
      },
    ],
    []
  );

  /* ✅ animated counter (0 → 100000) */
  const sectionRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [customerCount, setCustomerCount] = useState(0);
  const customerTarget = 100000;

  useEffect(() => {
    // start animation when section is visible
    if (!sectionRef.current) return;
    const el = sectionRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const duration = 1800;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.floor(eased * customerTarget);
      setCustomerCount(current);
      if (progress < 1) requestAnimationFrame(tick);
      else setCustomerCount(customerTarget);
    };

    requestAnimationFrame(tick);
  }, [started]);

  const customerText =
    customerCount >= customerTarget
      ? "1,00,000+"
      : customerCount.toLocaleString("en-IN");

  return (
    <section ref={sectionRef} id="reviews-section" className="bg-accent px-[5%] py-12">
      <div className="mx-auto max-w-8xl">
        <h2 className="text-center cormorant-garamond-700 uppercase text-primary tracking-tight text-2xl sm:text-3xl md:text-4xl xl:text-5xl">
          Worn &amp; Loved
        </h2>
        <p className="text-center montserrat-500 tracking-[0.05em] text-primary/70 text-sm sm:text-base md:text-lg mt-2 mb-6 md:mb-8">
          From first wear to everyday favourite — in their own words.
        </p>

        {/* ✅ CAROUSEL (same as you have) */}
        <Carousel
          opts={{ align: "start", loop: items.length > 4 }}
          plugins={[autoplay.current]}
          className="relative w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {items.map((t) => (
              <CarouselItem
                key={t.id}
                className="pl-2 md:pl-4 basis-full md:basis-1/3 xl:basis-1/4"
              >
                <ReviewFlipCard t={t} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious
            className="hidden sm:flex h-11 w-11 bg-primary! text-white! z-10"
            aria-label="Previous"
          />
          <CarouselNext
            className="hidden sm:flex h-11 w-11 bg-primary! text-white! z-10"
            aria-label="Next"
          />
        </Carousel>

        {/* ✅ AFTER CAROUSEL: 100000+ + animated stars */}
      </div>
    </section>
  );
}
