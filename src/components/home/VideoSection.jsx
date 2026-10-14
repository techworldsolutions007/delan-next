'use client';
import React, { useEffect, useRef, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";

// const MOBILE_VIDEO = "https://cdn.shopify.com/videos/c/o/v/bf48e08356fd4d7d971f8a3a66131122.mp4";
// const DESKTOP_VIDEO = "https://cdn.shopify.com/videos/c/o/v/5b0c476a9d0c4111971b1711e2f22b63.mp4";
// const VIDEO_POSTER = "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/delan-mobile-hero-poster.webp?v=1763975564";


const MOBILE_VIDEO = "https://cdn.shopify.com/videos/c/o/v/bf48e08356fd4d7d971f8a3a66131122.mp4";
const DESKTOP_VIDEO = "https://cdn.shopify.com/videos/c/o/v/5339c77954034e89bba4677491c5ef0c.mp4";   //old ggn shoot
const VIDEO_POSTER = "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/delan-mobile-hero-poster.webp?v=1763975564";

function detectIOS() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/i.test(ua);
}

export default function VideoSection() {
    const [isIOS, setIsIOS] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        setIsIOS(detectIOS());
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const delay = isIOS ? 1500 : 500;

        const timer = setTimeout(() => {
            video.muted = true;
            video.playsInline = true;

            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(() => {
                    // Stay on poster if autoplay fails
                });
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [isIOS]);

    return (
        <section className="bg-white px-[5%] pt-10 pb-6 text-center md:pb-10">
            <SectionHeader
                title="Behind The Scenes"
                subtitle="The Art of Creating Elegance"
                className="mb-6 md:mb-8"
            />

            <div className="relative w-full overflow-hidden bg-neutral-100 h-[60vh] md:h-[70vh] lg:h-[80vh] rounded-2xl mx-auto max-w-7xl">
                <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload={isIOS ? "none" : "metadata"}
                    poster={VIDEO_POSTER}
                    controls={false}
                    disablePictureInPicture
                    aria-label="Full width video"
                >
                    <source src={DESKTOP_VIDEO} type="video/mp4" media="(min-width: 768px)" />
                    <source src={MOBILE_VIDEO} type="video/mp4" media="(max-width: 767px)" />
                    Your browser does not support the video tag.
                </video>
            </div>
        </section>
    );
}
