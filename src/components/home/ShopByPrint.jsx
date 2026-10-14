'use client';
import Link from 'next/link';
import Image from 'next/image';
// ShopByPrint.jsx (with Shopify integration)

import { useEffect, useState } from "react";
import { shopify } from "@/lib/shopify"; // your existing fetch utility
import SectionHeader from "@/components/ui/SectionHeader";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

const PRINT_COLLECTIONS = [
    { handle: "dresses", imageUrl: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/sketch_wall_paper_final.jpg?v=1773813996", customName: "AFTERLIGHT" }, // Add your custom name here
    { handle: "dresses", imageUrl: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/tropical_jungle_1_png.jpg?v=1773813995", customName: "JUNGLE PRINT" }, // Add your custom name here
    { handle: "dresses", imageUrl: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/print_-_1_jpg.jpg?v=1773813995", customName: "LOVE IN BLOOM" }, // Add your custom name here
    { handle: "dresses", imageUrl: "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/4th_kaftaaan.jpg?v=1774427089", customName: "AREL ARTISTIC" }, // Add your custom name here
];

const GET_COLLECTION_BY_HANDLE = `
  query GetCollection($handle: String!) {
    collection(handle: $handle) {
      id
      title
      handle
      image {
        url
        altText
      }
    }
  }
`;

export default function ShopByPrint() {
    const [prints, setPrints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPrints() {
            try {
                // Fetch all 4 collections in parallel
                const results = await Promise.all(
                    PRINT_COLLECTIONS.map(({ handle }) =>
                        shopify(GET_COLLECTION_BY_HANDLE, { handle })
                    )
                );

                const collections = results
                    .map((res, index) => {
                        const col = res?.collection;
                        if (!col) return null;
                        return {
                            ...col,
                            displayImage: PRINT_COLLECTIONS[index].imageUrl,
                            customName: PRINT_COLLECTIONS[index].customName
                        };
                    })
                    .filter(Boolean)
                    .filter((col, i, arr) => arr.findIndex((c) => c.id === col.id) === i);

                setPrints(collections);
            } catch (err) {
                console.error("Failed to fetch print collections:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchPrints();
    }, []);

    if (loading) {
        return (
            <section className="bg-white px-[5%] pt-10 pb-6 md:pb-10">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        title="Shop by Print"
                        subtitle="Each print has a story. Find the one that's yours."
                        className="mb-6 md:mb-8"
                    />
                    <Carousel
                        opts={{
                            align: "start",
                            loop: true,
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-4 md:-ml-7">
                            {[...Array(4)].map((_, i) => (
                                <CarouselItem key={i} className="pl-4 md:pl-7 basis-full md:basis-1/2 lg:basis-1/3">
                                    <div className="aspect-[16/10] md:aspect-square bg-neutral-100 animate-pulse rounded-2xl" />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-white px-[5%] pt-10 pb-6 md:pb-10">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    title="Shop by Print"
                    subtitle="Each print has a story. Find the one that's yours."
                    className="mb-6 md:mb-8"
                />

                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full group"
                >
                    <CarouselContent className="-ml-4 md:-ml-7">
                        {prints.map((print) => (
                            <CarouselItem key={print.id} className="pl-4 md:pl-7 basis-full md:basis-1/2 lg:basis-1/3">
                                <Link href={`/collections/${print.handle}`}
                                    className="group block"
                                >
                                    <div className="relative overflow-hidden aspect-[16/10] md:aspect-square rounded-2xl shadow-sm border border-black/5 mb-3">
                                        <Image
                                            src={print.displayImage || print.image?.url}
                                            alt={print.image?.altText || print.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </div>
                                    <div className="text-center">
                                        <span
                                            className="text-primary text-xs md:text-sm font-bold tracking-[0.14em] uppercase transition-colors duration-300 group-hover:opacity-85"
                                        >
                                            {print.customName || print.title}
                                        </span>
                                    </div>
                                </Link>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <div className="block">
                        <CarouselPrevious
                            className="left-2 lg:-left-12 h-10 w-10 !bg-[#642c44] !text-white hover:!bg-[#642c44]/90 !border-none shadow-lg transition-all duration-300 disabled:opacity-30"
                        />
                        <CarouselNext
                            className="right-2 lg:-right-12 h-10 w-10 !bg-[#642c44] !text-white hover:!bg-[#642c44]/90 !border-none shadow-lg transition-all duration-300 disabled:opacity-30"
                        />
                    </div>
                </Carousel>
            </div>
        </section>
    );
}
