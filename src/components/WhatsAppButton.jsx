'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect, useMemo, useRef } from "react";

const WHATSAPP_NUMBER = "919266246661";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://delan.in";

function useWhatsAppMessage() {
  const pathname = usePathname();

  return useMemo(() => {
    const currentUrl = `${SITE_URL}${pathname}`;

    // Home page
    if (pathname === "/") {
      return `Hii i am visiting the home page on delan.\n\n${currentUrl}`;
    }

    // Collection page: /collections/:handle
    const collectionMatch = pathname.match(/^\/collections\/(.+)$/);
    if (collectionMatch) {
      const handle = collectionMatch[1];
      const name = handle
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `Hii i am visiting the ${name} collection page on delan.\n\n${currentUrl}`;
    }

    // Other known pages
    const pageNames = {
      "/contact": "contact",
      "/track-order": "track order",
      "/about-us": "about us",
      "/faq": "faq",
      "/returns-exchange": "returns & exchange",
      "/privacy-policy": "privacy policy",
      "/shipping-policy": "shipping policy",
      "/terms-conditions": "terms & conditions",
      "/why-delan": "why delan",
      "/fabric-care": "fabric care",
      "/affiliate-program": "affiliate program",
      "/search": "search",
    };

    if (pageNames[pathname]) {
      return `Hii i am visiting the ${pageNames[pathname]} page on delan.\n\n${currentUrl}`;
    }

    // Default fallback
    return `Hii i am browsing delan.\n\n${currentUrl}`;
  }, [pathname]);
}

export default function WhatsAppButton() {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const pathname = usePathname();
  const message = useWhatsAppMessage();
  const lastScrollY = useRef(0);

  // Link for WhatsApp
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // Hide on Product pages as they have sticky Add to Cart and Suggestion Popups
  const isProductPage = pathname.startsWith("/products/");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync with Cart Sidebar state from Navbar
  useEffect(() => {
    const handleCartState = (e) => {
      setCartOpen(!!e.detail?.open);
    };
    window.addEventListener("cart:state-change", handleCartState);
    return () => window.removeEventListener("cart:state-change", handleCartState);
  }, []);

  // Collapse if user scrolls down/up significantly while expanded
  useEffect(() => {
    if (!expanded) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = Math.abs(currentScrollY - lastScrollY.current);
      if (delta > 30) {
        setExpanded(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [expanded]);

  // Handle click logic: first click expands, second click navigates
  const handleClick = (e) => {
    if (!expanded) {
      e.preventDefault();
      lastScrollY.current = window.scrollY;
      setExpanded(true);
    }
    // else: follow the href link (default behavior)
  };

  // Completely remove from Product page or when Cart is open
  if (isProductPage || cartOpen) return null;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      onClick={handleClick}
      className={expanded ? "wa-expanded" : "wa-collapsed"}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#25D366",
        color: "#fff",
        borderRadius: "50px",
        padding: expanded ? "12px 24px" : "14px",
        boxShadow: "0 4px 15px rgba(37, 211, 102, 0.4)",
        cursor: "pointer",
        textDecoration: "none",
        transition: "max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), padding 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        maxWidth: expanded ? "240px" : "56px",
        height: "56px",
        whiteSpace: "nowrap",
      }}
    >
      {/* WhatsApp Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="#fff"
        style={{ flexShrink: 0, display: "block" }}
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>

      {/* Label - shows when expanded */}
      {expanded && (
        <span
          style={{
            marginLeft: "12px",
            fontSize: "15px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            color: "#fff",
            fontFamily: "inherit",
            lineHeight: "1",
          }}
        >
          Chat with us
        </span>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes wa-pulse {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      {/* Pulse ring when collapsed */}
      {!expanded && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(37, 211, 102, 0.5)",
            animation: "wa-pulse 2s infinite",
            pointerEvents: "none",
            willChange: "transform, opacity",
          }}
        />
      )}
    </a>
  );
}
