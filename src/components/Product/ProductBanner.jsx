'use client';
// src/components/product/ProductBanner.jsx



import React, { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";



import { shopify } from "@/lib/shopify";



import { ChevronRight, ChevronLeft } from "lucide-react";







/* ---------------- Shopify queries (no Apollo) ---------------- */



const GET_IMAGES_BY_TITLE = /* GraphQL */ `



  query ImagesByTitle($query: String!) {



    products(first: 1, query: $query) {



      edges {



        node {



          id



          title



          images(first: 50) {



            edges { node { url altText } }



          }



          media(first: 50) {



            edges {



              node {



                __typename



                ... on MediaImage { image { url altText } }



              }



            }



          }



        }



      }



    }



  }



`;







const GET_VIDEOS_BY_TITLE = /* GraphQL */ `



  query VideosByTitle($query: String!) {



    products(first: 1, query: $query) {



      edges {



        node {



          id



          title



          media(first: 10) {



            edges {



              node {



                __typename



                ... on Video {



                  previewImage { url }



                  sources { url mimeType }



                }



                # If you store ExternalVideo, you can extend here and render an <iframe>.



                # ... on ExternalVideo { host embeddedUrl }



              }



            }



          }



        }



      }



    }



  }



`;







/* ---------------- helpers ---------------- */



async function fetchImageUrlsByProductTitle(title) {



  const query = `title:'${String(title).replace(/'/g, "\\'")}'`;



  const data = await shopify(GET_IMAGES_BY_TITLE, { query });







  const product = data?.products?.edges?.[0]?.node;



  if (!product) return [];







  const urls = [];







  // classic images



  for (const e of product.images?.edges || []) {



    if (e?.node?.url) urls.push(e.node.url);



  }



  // media images



  for (const e of product.media?.edges || []) {



    const img = e?.node?.image;



    if (img?.url) urls.push(img.url);



  }



  return Array.from(new Set(urls)).slice(0, 50);



}







async function fetchVideosByProductTitle(title) {



  const query = `title:'${String(title).replace(/'/g, "\\'")}'`;



  const data = await shopify(GET_VIDEOS_BY_TITLE, { query });



  const mediaEdges = data?.products?.edges?.[0]?.node?.media?.edges || [];







  // Collect mp4 sources + preview



  const videos = [];



  for (const e of mediaEdges) {



    const n = e?.node;



    if (n?.__typename === "Video") {



      const mp4 = (n?.sources || []).find(



        (s) => s?.url && String(s?.mimeType || "").toLowerCase().includes("mp4")



      )?.url;



      if (mp4) {



        videos.push({



          url: mp4,



          poster: n?.previewImage?.url || "",



        });



      }



    }



  }



  // Preserve order and de-dupe by url



  const seen = new Set();



  return videos.filter((v) => (seen.has(v.url) ? false : (seen.add(v.url), true)));



}







/**



 * ProductBanner — Shopify-only media



 *   Images (desktop):  "Product Page Banner"



 *   Images (mobile):   "Product Page Banner Mobile"



 *   Videos (both):     "Product Page Banner Video"  -> [0]=desktop, [1]=mobile (mobile falls back to [0])



 */



const ProductBanner = ({



  className = "",



  autoPlay = true,



  loop = true,



  muted = true,



  fit = "cover", // 'cover' | 'contain' | 'fill'



  videoHeight = "h-[100vh]",



  videoHeightMobile = "h-[70vh]",



  imageBannerHeight = "h-[100vh]",



  imageBannerHeightMobile = "h-[70vh]",



  mobileBreakpoint = 768,



  desktopProductTitle = "Product Page Banner",



  mobileProductTitle = "Product Page Banner Mobile",



  videoProductTitle = "Product Page Banner Video",



}) => {



  const videoRef = useRef(null);







  // responsive



  const [isMobile, setIsMobile] = useState(() => {



    if (typeof window === "undefined") return false;



    return window.innerWidth <= mobileBreakpoint;



  });







  // rotation state



  const [index, setIndex] = useState(0);



  const [isPaused, setIsPaused] = useState(false);



  const pauseTimeoutRef = useRef(null);







  // fetched media



  const [desktopImgs, setDesktopImgs] = useState([]);



  const [mobileImgs, setMobileImgs] = useState([]);



  const [desktopVideo, setDesktopVideo] = useState({ url: "", poster: "" });



  const [mobileVideo, setMobileVideo] = useState({ url: "", poster: "" });



  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {

    let cancelled = false;

    (async () => {

      try {
        const [deskImgs, mobImgs, videos] = await Promise.all([



          fetchImageUrlsByProductTitle(desktopProductTitle),



          fetchImageUrlsByProductTitle(mobileProductTitle),



          fetchVideosByProductTitle(videoProductTitle),



        ]);



        if (cancelled) return;







        setDesktopImgs(deskImgs.slice(0, 8));



        setMobileImgs(mobImgs.slice(0, 8));







        // videos: [0] desktop, [1] mobile (mobile fallback to [0])



        const vDesk = videos?.[0] || { url: "", poster: "" };



        const vMob = videos?.[1] || videos?.[0] || { url: "", poster: "" };



        setDesktopVideo(vDesk);



        setMobileVideo(vMob);



      } catch (e) {



        if (!cancelled) {



          console.error("[ProductBanner] media fetch failed:", e);



          setLoadErr("Couldn't load banner media.");



          setDesktopImgs([]);



          setMobileImgs([]);



          setDesktopVideo({ url: "", poster: "" });



          setMobileVideo({ url: "", poster: "" });



        }



      }



    })();



    return () => {



      cancelled = true;



    };



    // eslint-disable-next-line react-hooks/exhaustive-deps



  }, [desktopProductTitle, mobileProductTitle, videoProductTitle]);







  // slides based on device



  const slides = useMemo(() => {



    const arr = isMobile ? mobileImgs : desktopImgs;



    return Array.isArray(arr) ? arr.slice(0, 8) : [];



  }, [isMobile, desktopImgs, mobileImgs]);







  // rotate slides (respects isPaused)



  useEffect(() => {



    if (slides.length <= 1 || isPaused) return;



    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 3000);



    return () => clearInterval(id);



  }, [slides.length, isPaused]);







  // reset index when slides/device changes



  useEffect(() => setIndex(0), [isMobile, slides.length]);







  // responsive detection



  useEffect(() => {



    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {



      setIsMobile(window?.innerWidth <= mobileBreakpoint);



      return;



    }



    const mql = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`);



    const update = (e) => setIsMobile(!!e.matches);



    mql.addEventListener?.("change", update);



    setIsMobile(!!mql.matches);



    return () => mql.removeEventListener?.("change", update);



  }, [mobileBreakpoint]);







  // choose video src & poster based on device



  const activeVideoUrl = isMobile ? mobileVideo.url : desktopVideo.url;



  const derivedPoster =



    (isMobile ? mobileVideo.poster : desktopVideo.poster) || slides?.[0] || "";







  // heights



  const effectiveVideoHeight = isMobile ? videoHeightMobile : videoHeight;



  const effectiveImageBannerHeight = isMobile ? imageBannerHeightMobile : imageBannerHeight;







  // object-fit mapping



  const objectFitClass =



    fit === "contain" ? "object-contain" : fit === "fill" ? "object-fill" : "object-cover";







  // controls



  const pauseAutoRotation = (timeout = 5000) => {



    setIsPaused(true);



    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);



    pauseTimeoutRef.current = setTimeout(() => setIsPaused(false), timeout);



  };



  useEffect(() => () => pauseTimeoutRef.current && clearTimeout(pauseTimeoutRef.current), []);







  const goPrev = () => {



    if (slides.length <= 1) return;



    setIndex((i) => (i - 1 + slides.length) % slides.length);



    pauseAutoRotation();



  };



  const goNext = () => {



    if (slides.length <= 1) return;



    setIndex((i) => (i + 1) % slides.length);



    pauseAutoRotation();



  };







  const handleKeyDown = (e) => {



    if (e.key === "ArrowLeft") goPrev();



    if (e.key === "ArrowRight") goNext();



  };







  return (



    <div className={`w-full ${className}`} onKeyDown={handleKeyDown} tabIndex={0}>



      {/* Optional minimal error banner */}



      {loadErr ? (



        <div className="bg-yellow-50 text-yellow-900 text-xs px-3 py-2">{loadErr}</div>



      ) : null}







      {/* Video (only if a Shopify video exists) */}



      {activeVideoUrl ? (



        <div className={`relative w-full overflow-hidden ${effectiveVideoHeight}`}>



          <video



            key={activeVideoUrl} // remount when src changes



            ref={videoRef}



            autoPlay={autoPlay}



            loop={loop}



            muted={muted}



            playsInline



            poster={derivedPoster || undefined}



            preload="metadata"



            className={`w-full h-full ${objectFitClass}`}



            aria-label="Product video"



          >



            <source src={activeVideoUrl} type="video/mp4" />



            Your browser does not support the video tag.



          </video>



        </div>



      ) : null}







      {/* Image slider */}



      {slides.length > 0 && (



        <div>



          <div



            className={`relative w-full overflow-hidden ${effectiveImageBannerHeight}`}



            onMouseEnter={() => setIsPaused(true)}



            onMouseLeave={() => setIsPaused(false)}



          >



            {slides.map((url, i) => {



              const isFirst = i === 0;



              return (



                <Image



                  key={`${url}-${i}`}



                  src={url}



                  alt={`Slide ${i + 1}`}



                  fill



                  className={`${objectFitClass} transition-opacity duration-500 ${



                    index === i ? "opacity-100" : "opacity-0"



                  }`}



                  priority={isFirst}



                  draggable={false}



                  onDragStart={(e) => e.preventDefault()}



                />



              );



            })}







            {slides.length > 1 && (



              <>



                <button



                  type="button"



                  onClick={goPrev}



                  aria-label="Previous slide"



                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white"



                >



                  <ChevronLeft className="text-white" />



                </button>







                <button



                  type="button"



                  onClick={goNext}



                  aria-label="Next slide"



                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white backdrop-blur-sm focus:outline-none focus:ring-0 focus:ring-none"



                >



                  <ChevronRight className="text-white" />



                </button>



              </>



            )}



          </div>







          {slides.length > 1 && (



            <div className="mt-2 flex items-center justify-center gap-2 mb-10">



              {slides.map((_, i) => (



                <button



                  key={i}



                  type="button"



                  onClick={() => {



                    setIndex(i);



                    pauseAutoRotation();



                  }}



                  aria-label={`Go to slide ${i + 1}`}



                  className={`h-2 w-2 rounded-full transition-opacity ${



                    index === i ? "opacity-100" : "opacity-40"



                  } bg-primary`}



                />



              ))}



            </div>



          )}



        </div>



      )}



    </div>



  );



};







export default ProductBanner;

