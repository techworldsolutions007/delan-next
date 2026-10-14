'use client';
import Link from 'next/link';
import Image from 'next/image';
// src/components/CoOrdsSection.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";
 
const BRAND = "#642c44";

/* ------------------ 5 PRODUCTS CONFIG ------------------ */
const PRODUCTS = [
  {
    id: 1,
    image:
      // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/12_25af1f3f-9785-4209-b6e0-f2d00be39c3b.png?v=1769689722",
      // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/RED_FLORAL_PNF.png?v=1770183519",
      "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/saef.png?v=1770377722",
    alt: "Red and White Floral Mini Dress",
    title: "Red & White Floral Mini Dress",
    subtitle: "Fresh Florals, Effortless Charm",
    tagline: "A playful mini dress featuring bold florals and a flattering silhouette.",
    to: "/products/white-and-red-floral-midi-dress-for-women",
  },
  {
    id: 2,
    image:
      //"https://cdn.shopify.com/s/files/1/0714/4420/1639/files/13_223f6f99-9c2d-4827-9cf8-9c0060a56cff.png?v=1769689722",
      "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/gfgfhgfh.png?v=1770186449",
    alt: "Yellow Co-ord Set",
    title: "Yellow Co-ord Set",
    subtitle: "Bright, Bold, Beautiful",
    tagline: "A sunshine-hued co-ord set designed for standout summer styling.",
    to: "/products/yellow-blue-satin-co-ord-set-for-women",
  },
  {
    id: 3,
    image:
      // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/16_ae640c9e-2af9-4a1a-9240-ad372a4211fc.png?v=1769689722",
      "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/black-trrr.png?v=1770186114",
    alt: "Black Leather Pants",
    title: "Leather Pants",
    subtitle: "Edge Meets Elegance",
    tagline: "Sleek leather pants crafted to elevate your power wardrobe.",
    to: "/products/delan-black-vegan-leather-pants-for-women",
  },
  {
    id: 4,
    image:
      //"https://cdn.shopify.com/s/files/1/0714/4420/1639/files/14_705c334e-22b9-4a6c-abf9-d514f4878657.png?v=1769689722",
      "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/kkkkkkl.png?v=1770186573",
    alt: "Red Dress",
    title: "Red Dress",
    subtitle: "Bold Confidence in Every Step",
    tagline: "A striking red dress designed to make an unforgettable impression.",
    to: "/products/red-poplin-fit-and-flare-dress-for-women",
  },
  {
    id: 5,
    image:
      // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/15_198faa6c-9ef9-409d-8fc8-f34985bec4b4.png?v=1769689722",
      "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/hsdjh.png?v=1770186314",
    alt: "Signature Mini Dress",
    title: "Signature Mini Dress",
    subtitle: "Timeless Style, Modern Fit",
    tagline: "A refined mini dress crafted for effortless day-to-night dressing.",
    to: "/products/signature-beige-mini-dress-for-women-in-viscose-heavy-twill",
  },
];


export default function CoOrdsSection() {
  const [api, setApi] = useState(null);
  const [selected, setSelected] = useState(0);

  /* Sync text/CTA with active slide */
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => api.off("select", onSelect);
  }, [api]);

  const activeProduct = PRODUCTS[selected % PRODUCTS.length];

  return (
    <section className="relative overflow-hidden bg-accent py-10">
      {/* Top layout */}
      <div className="mx-auto grid w-[min(90%,1400px)] items-center justify-items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        {/* Left text */}
        <div className="hidden select-none text-primary md:flex md:flex-col md:justify-center">
          <span className="cormorant-garamond-700 text-[clamp(28px,4.5vw,56px)] font-bold">
            FIND
          </span>
          <span className="ml-16 cormorant-garamond-700 text-[clamp(28px,4.5vw,56px)] font-bold">
            YOUR
          </span>
          <span className="ml-36 cormorant-garamond-700 text-[clamp(28px,4.5vw,56px)] font-bold">
            VIBE
          </span>
        </div>

        {/* Carousel */}
        <div className="flex items-center  rounded-2xl justify-center bg-white">
          <Card className="rounded-2xl bg-white">
            <CardContent className="px-0!">
              <Carousel
                opts={{ align: "center", loop: true }}
                setApi={setApi}
                className="relative w-[300px] sm:w-[340px] md:w-[320px]"
              >
                <CarouselContent>
                  {PRODUCTS.map((p) => (
                    <CarouselItem key={p.id} className="basis-full">
                      <AspectRatio ratio={3 / 4}>
                        <Link href={p.to} className="relative block h-full w-full">
                          <Image
                            src={p.image}
                            alt={p.alt}
                            fill
                            className="rounded-2xl object-cover"
                            draggable="false"
                          />
                        </Link>
                      </AspectRatio>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <CarouselPrevious className="left-[-30px] md:left-[-50px] h-11 w-11 rounded-full bg-primary! text-white!" />
                <CarouselNext className="right-[-30px] md:right-[-50px] h-11 w-11 rounded-full bg-primary! text-white!" />
              </Carousel>
            </CardContent>
          </Card>
        </div>

        {/* Right text */}
        <div className="hidden select-none text-right text-primary md:flex md:flex-col md:justify-center">
          <span className="-mr-12 cormorant-garamond-700 text-[clamp(28px,4.5vw,56px)] font-bold">
            OWN
          </span>
          <span className="mr-4 cormorant-garamond-700 text-[clamp(28px,4.5vw,56px)] font-bold">
            YOUR
          </span>
          <span className="mr-10 cormorant-garamond-700 text-[clamp(28px,4.5vw,56px)] font-bold">
            MOMENT
          </span>
        </div>

        {/* Mobile headline */}
        <div className="col-span-full flex justify-center md:hidden">
          <p className="cormorant-garamond-700 text-[clamp(28px,7vw,44px)] font-bold text-primary">
            FIND YOUR VIBE
          </p>
        </div>
      </div>

      {/* Description + CTA */}
      <div className="mx-auto mt-6 flex max-w-[900px] flex-col items-center px-5 text-center">
        <p className="montserrat-500 text-md tracking-wide text-primary tracking-[0.02em]">
          {activeProduct.title}
        </p>

        <h3 className="cormorant-garamond-700 text-3xl md:text-4xl uppercase text-primary">
          {activeProduct.subtitle}
        </h3>

        <p className="montserrat-500 mt-1 max-w-[640px] text-primary tracking-[0.02em]">
          {activeProduct.tagline}
        </p>

        <Button
          asChild
          variant="outline"
          className="mt-6 uppercase montserrat-600 px-6 py-5 border-2 transition-all duration-300"
          style={{ borderColor: BRAND, color: BRAND }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BRAND;
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = BRAND;
          }}
        >
          <Link href={activeProduct.to} aria-label="Shop Product" className="tracking-[0.3em]"> 
            SHOP NOW
          </Link>
        </Button>
      </div>
    </section>
  );
}
