'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Search,
  ShoppingBag,
  LogOut,
  ChevronDown,
  UserRound,
  Heart,
  ArrowLeft,
} from "lucide-react";
const logo = "/images/Delan-logo.svg";

import { GET_MENU } from "@/lib/queries";
import { shopify } from "@/lib/shopify";
import CartSidebar from "@/components/CartSidebar";
import SearchSidebar from "./SearchSidebar";
import WishlistSidebar from "@/components/WishlistSidebar";
import { readWishlistIds, WISHLIST_STORAGE_KEY } from "@/lib/wishlistStore";

/* ---------------- utils ---------------- */
const toRelative = (url) => {
  if (!url) return "#";
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
};

const PRIMARY_TEXT = "text-primary";
const MOBILE_ICON_TRANSITION_MS = 420;

const CART_ID_KEY = "shopifyCartId";
const CART_MIN_QUERY = /* GraphQL */ `
  query CartMin($cartId: ID!) {
    cart(id: $cartId) {
      id
      totalQuantity
    }
  }
`;

async function unwrapAsync(resp) {
  let r = resp;
  if (r && typeof r.json === "function") {
    try {
      r = await r.json();
    } catch { }
  }
  const body = r?.data ?? r;
  if (Array.isArray(r?.errors) && r.errors.length) {
    throw new Error(r.errors.map((e) => e.message).join("; "));
  }
  return body;
}

function getStoredCartId() {
  try {
    return localStorage.getItem(CART_ID_KEY) || null;
  } catch {
    return null;
  }
}

function getShopOrigin() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_SHOPIFY_API_ENDPOINT;
    if (!endpoint) return null;
    return new URL(endpoint).origin;
  } catch {
    return null;
  }
}

function initialsFrom(name, fallback = "U") {
  if (!name) return fallback;
  const parts = String(name).trim().split(/\s+/);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
  return letters || fallback;
}

/* ---------------- component ---------------- */
export default function Navbar() {
  const pathname = usePathname();
  const { isLoggedIn, authChecked, customer, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [cartQty, setCartQty] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(
    () => readWishlistIds().length
  );

  // control the mobile sheet explicitly so we can close on navigation
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(false);

  // ✅ Fix: don't depend on `customer` (it loads async)
  const loggedIn = !!isLoggedIn;

  // Shopify-hosted URLs
  const { accountUrl, registerUrl } = useMemo(() => {
    const origin = getShopOrigin();
    return {
      registerUrl: origin ? `${origin}/account/register` : "/account/register",
      accountUrl: origin ? `${origin}/account` : "/account",
    };
  }, []);

  const [showHeader, setShowHeader] = useState(true);
  const lastYRef = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowHeader(y <= lastYRef.current || y <= 50);
      lastYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // wishlist count sync
  useEffect(() => {
    const syncCount = (detail) => {
      if (detail && Array.isArray(detail.ids)) {
        setWishlistCount(detail.ids.length);
      } else {
        setWishlistCount(readWishlistIds().length);
      }
    };
    const handleWishlist = (event) => syncCount(event.detail);
    const handleStorage = (event) => {
      if (event.key === WISHLIST_STORAGE_KEY) syncCount();
    };
    window.addEventListener("wishlist:updated", handleWishlist);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("wishlist:updated", handleWishlist);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // load Shopify main menu
  useEffect(() => {
    (async () => {
      try {
        const raw = await shopify(GET_MENU, { handle: "main-menu-copy" });
        const d = await unwrapAsync(raw);

        const filterWhatsApp = (menuItems) => {
          if (!Array.isArray(menuItems)) return [];
          return menuItems
            .filter((item) => {
              const title = (item.title || "").toLowerCase();
              const url = (item.url || "").toLowerCase();
              return !title.includes("whatsapp") && !url.includes("whatsapp") && !url.includes("wa.me");
            })
            .map((item) => ({
              ...item,
              items: item.items ? filterWhatsApp(item.items) : [],
            }));
        };

        const filteredItems = filterWhatsApp(d?.menu?.items || []);
        setItems(filteredItems);
      } catch (e) {
        console.error("Menu load failed:", e);
        setItems([]);
      }
    })();
  }, []);

  const refreshCartQty = useCallback(async () => {
    try {
      const id = getStoredCartId();
      if (!id) return setCartQty(0);
      const raw = await shopify(CART_MIN_QUERY, { cartId: id });
      const d = await unwrapAsync(raw);
      setCartQty(d?.cart?.totalQuantity || 0);
    } catch (e) {
      console.warn("Cart qty refresh failed:", e);
      setCartQty(0);
    }
  }, []);

  useEffect(() => {
    const onCartUpdated = (e) => {
      const q = e?.detail?.totalQuantity;
      if (typeof q === "number") setCartQty(q);
      else refreshCartQty();
    };
    const onCartOpen = () => setCartOpen(true);

    window.addEventListener("cart:updated", onCartUpdated);
    window.addEventListener("cart:open", onCartOpen);
    return () => {
      window.removeEventListener("cart:updated", onCartUpdated);
      window.removeEventListener("cart:open", onCartOpen);
    };
  }, [refreshCartQty]);

  // Auto-open cart sidebar when item is added
  useEffect(() => {
    const onCartItemAdded = () => {
      setCartOpen(true);
    };
    window.addEventListener("cart:item-added", onCartItemAdded);
    return () => window.removeEventListener("cart:item-added", onCartItemAdded);
  }, []);

  useEffect(() => {
    refreshCartQty();
    const onStorage = (e) => {
      if (e.key === CART_ID_KEY) refreshCartQty();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshCartQty]);

  const handleCartOpenChange = useCallback(
    (open) => {
      setCartOpen(open);
      if (!open) setTimeout(refreshCartQty, 250);
    },
    [refreshCartQty]
  );

  // Emit cart state to global listeners (e.g. WhatsApp button)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("cart:state-change", { detail: { open: cartOpen } }));
  }, [cartOpen]);

  // Emit mobile menu state to global listeners (e.g. WhatsApp button)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("mobile-menu:state-change", {
        detail: {
          open: mobileOpen,
          active: mobileOpen,
        },
      })
    );
  }, [mobileOpen]);

  const handleSearchOpenChange = useCallback((open) => {
    setSearchOpen(open);
  }, []);

  const main = useMemo(() => items ?? [], [items]);

  async function handleLogout() {
    await logout?.();
  }

  const displayName =
    (customer?.firstName && customer?.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : customer?.firstName || customer?.email) || "Account";

  const avatarFallback = initialsFrom(
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
    customer?.email ||
    ""
  );

  /* controlled desktop dropdown open state */
  const [openIdx, setOpenIdx] = useState(null);
  const closeTimerRef = useRef(null);
  const previousPathRef = useRef(pathname);

  const openMobile = useCallback(() => {
    setMobileSubmenuOpen(false);
    setMobileOpen(true);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileSubmenuOpen(false);
    setMobileOpen(false);
  }, []);

  // auto-close mobile sheet when route changes (safety net)
  useEffect(() => {
    if (previousPathRef.current === pathname) return;

    previousPathRef.current = pathname;

    if (mobileOpen) {
      closeMobile();
    }
  }, [pathname, mobileOpen, closeMobile]);

  const openMenu = (i) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenIdx(i);
  };
  const scheduleCloseMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpenIdx(null), 120);
  };

  // active child per parent for nested submenu
  const [activeChildByParent, setActiveChildByParent] = useState({}); // { [parentIdx]: childIdx }
  const [submenuSideByParent, setSubmenuSideByParent] = useState({}); // { [parentIdx]: "left" | "right" }

  const handleChildActivate = (parentIdx, childIdx, el) => {
    setActiveChildByParent((prev) => ({
      ...prev,
      [parentIdx]: childIdx,
    }));

    if (el && typeof window !== "undefined") {
      const rect = el.getBoundingClientRect();
      const panel = el.closest('[data-slot="popover-content"]');
      const PANEL_WIDTH = panel?.getBoundingClientRect().width || 240;
      const SUBMENU_GAP = 2;
      const side =
        rect.right + PANEL_WIDTH + SUBMENU_GAP > window.innerWidth
          ? "left"
          : "right";
      setSubmenuSideByParent((prev) => ({
        ...prev,
        [parentIdx]: side,
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-[100] bg-white text-primary transition-transform duration-300 ${showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
    >
      {/* Top bar */}
      <div className="grid grid-cols-[1fr_auto_1fr] md:grid-cols-3 items-center border-b border-primary/10 px-3 sm:px-4 md:px-10 py-2.5 sm:py-3">
        {/* Left */}
        <div className="flex items-center gap-3 justify-self-start">
          <MobileMenuToggle
            open={mobileOpen}
            submenuOpen={mobileSubmenuOpen}
            onClick={() => {
              if (mobileSubmenuOpen) {
                window.dispatchEvent(new CustomEvent("mobile-menu:navigate-back"));
              } else if (mobileOpen) {
                closeMobile();
              } else {
                openMobile();
              }
            }}
          />

        </div>

        {/* Center brand */}
        <div
          className={`min-w-0 text-center justify-self-center ${mobileOpen ? "invisible pointer-events-none md:visible md:pointer-events-auto" : ""
            }`}
        >
          <Link href="/" className="block">
            <Image
              src={logo}
              alt="DELAN"
              width={200}
              height={68}
              className="mx-auto h-[42px] max-w-[128px] sm:h-[64px] sm:max-w-none md:h-[68px] w-auto"
              priority
            />
          </Link>
        </div>

        {/* Right */}
        <div
          className={`flex min-w-0 items-center gap-0.5 sm:gap-2 justify-self-end ${mobileOpen ? "invisible pointer-events-none md:visible md:pointer-events-auto" : ""
            }`}
        >
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Search"
            title="Search ( / )"
          >
            <Search className="h-5 w-5 text-primary" />
          </button>

          {/* ✅ Keep navbar same: Mobile Profile/SignUp icon */}
          {authChecked && (
            <a
              href={loggedIn ? accountUrl : registerUrl}
              className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
              aria-label={loggedIn ? "Profile" : "Sign Up"}
              title={loggedIn ? "Profile" : "Sign Up"}
            >
              <UserRound className="h-5 w-5 text-primary" />
            </a>
          )}

          {/* Auth area (desktop) */}
          {!authChecked ? (
            <div className="hidden sm:inline-block h-8 w-16" />
          ) : loggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-primary/50"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage alt={displayName} />
                    <AvatarFallback className="text-xs">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {displayName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <a href={accountUrl} className="w-full cursor-pointer">
                      My Account
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/track-order" className="w-full cursor-pointer">
                      Track Order
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center">
              <Button
                asChild
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full hover:bg-black/5"
                title="Sign Up"
                aria-label="Sign Up"
              >
                <a href={registerUrl} aria-label="Sign Up">
                  <UserRound className="h-5 w-5 text-primary" aria-hidden />
                  <span className="sr-only">Sign Up</span>
                </a>
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setWishlistOpen(true)}
            className="relative hidden md:inline-flex items-center hover:opacity-80"
            aria-label="Open wishlist"
          >
            <Heart className="h-5 w-5 text-primary" />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Open cart"
          >
            <span className="relative inline-flex">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {cartQty > 0 && (
                <span className="absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">
                  {cartQty}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom nav (desktop) */}
      <div className="hidden md:flex justify-center border-b border-[#e5eef8]">
        <NavigationMenu>
          <NavigationMenuList className="gap-1">
            {main.map((m, idx) => {
              const hasChildren = (m.items?.length ?? 0) > 0;

              if (!hasChildren) {
                return (
                  <NavigationMenuItem key={m.title} className="relative">
                    <Link href={toRelative(m.url)}
                      className={`montserrat-500 px-4 py-4 text-[14px] uppercase tracking-[0.15em] hover:bg-black/5 rounded transition ${pathname === toRelative(m.url)
                        ? "text-black"
                        : PRIMARY_TEXT
                        }`}
                    >
                      {m.title}
                    </Link>
                  </NavigationMenuItem>
                );
              }

              const isOpen = openIdx === idx;
              const children = m.items || [];
              const storedActiveIdx = activeChildByParent[idx];
              const activeChildIndex =
                typeof storedActiveIdx === "number" ? storedActiveIdx : null;
              const submenuSide = submenuSideByParent[idx] || "right";

              const handleParentOpenChange = (o) => {
                setOpenIdx(o ? idx : null);
                if (!o) {
                  setActiveChildByParent((prev) => {
                    const copy = { ...prev };
                    delete copy[idx];
                    return copy;
                  });
                }
              };

              return (
                <NavigationMenuItem key={m.title} className="relative">
                  <Popover open={isOpen} onOpenChange={handleParentOpenChange}>
                    <PopoverTrigger asChild>
                      <button
                        className="group montserrat-500 px-4 py-4 text-[14px] uppercase tracking-[0.15em] rounded bg-transparent hover:bg-black/5 inline-flex items-center text-primary"
                        onMouseEnter={() => openMenu(idx)}
                        onMouseLeave={scheduleCloseMenu}
                        onClick={() =>
                          setOpenIdx((cur) => (cur === idx ? null : idx))
                        }
                        aria-expanded={isOpen}
                        aria-haspopup="menu"
                      >
                        {m.title}
                        <ChevronDown
                          className={`ml-1 h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                          aria-hidden
                        />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      side="bottom"
                      align="start"
                      sideOffset={2}
                      style={{ width: "var(--radix-popover-trigger-width)" }}
                      className="w-auto min-w-0 p-0 bg-white border border-[#e5eef8] shadow-[0_6px_18px_rgba(0,0,0,0.08)] rounded-md z-50"
                      onMouseEnter={() => openMenu(idx)}
                      onMouseLeave={scheduleCloseMenu}
                    >
                      <ul className="w-full py-2">
                        {children.map((c, childIdx) => {
                          const hasSubItems = c.items && c.items.length > 0;
                          const isActive = childIdx === activeChildIndex;

                          return (
                            <li
                              key={c.title}
                              className="relative"
                              onMouseEnter={(e) =>
                                handleChildActivate(
                                  idx,
                                  childIdx,
                                  e.currentTarget
                                )
                              }
                            >
                              <div className="flex items-stretch">
                                <Link href={toRelative(c.url)}
                                  className="montserrat-500 text-primary flex-1 flex items-center gap-2 px-5 py-3 text-[12px] leading-5 tracking-[0.15em] uppercase hover:bg-black/5"
                                  onClick={() => setOpenIdx(null)}
                                >
                                  <span>{c.title}</span>
                                </Link>
                                {hasSubItems && (
                                  <button
                                    type="button"
                                    className="px-2 py-2 flex items-center justify-center bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none hover:bg-transparent"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleChildActivate(
                                        idx,
                                        childIdx,
                                        e.currentTarget.closest("li")
                                      );
                                    }}
                                  >
                                    <ChevronDown
                                      className={`h-3 w-3 -rotate-90 transition-opacity ${isActive ? "opacity-100" : "opacity-60"
                                        }`}
                                    />
                                  </button>
                                )}
                              </div>

                              {hasSubItems && (
                                <div
                                  className={`absolute top-[2px] ${submenuSide === "left"
                                    ? "right-[calc(100%+2px)]"
                                    : "left-[calc(100%+2px)]"
                                    } bg-white border border-[#e5eef8] rounded-md shadow-[0_6px_18px_rgba(0,0,0,0.12)] overflow-hidden transition-all duration-150 ease-out ${isActive
                                      ? "opacity-100 translate-y-0"
                                      : "pointer-events-none opacity-0 -translate-y-1"
                                    }`}
                                  style={{ width: "var(--radix-popover-trigger-width)" }}
                                >
                                  <ul className="py-2">
                                    {c.items.map((sub) => (
                                      <li key={sub.title}>
                                        <Link href={toRelative(sub.url)}
                                          className="montserrat-500 text-primary flex items-center gap-2 px-4 py-2 text-[14px] leading-5 uppercase tracking-[0.15em] hover:bg-black/5"
                                          onClick={() => setOpenIdx(null)}
                                        >
                                          <span>{sub.title}</span>
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Sidebars */}
      <SearchSidebar open={searchOpen} onOpenChange={handleSearchOpenChange} />
      <WishlistSidebar open={wishlistOpen} onOpenChange={setWishlistOpen} />
      <CartSidebar open={cartOpen} onOpenChange={handleCartOpenChange} />

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <AnimatedMobileMenu
              items={main}
              onClose={closeMobile}
              onSubmenuOpenChange={setMobileSubmenuOpen}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}

function HamburgerLines({ open }) {
  const lineTransition = { duration: MOBILE_ICON_TRANSITION_MS / 1000, ease: [0.22, 1, 0.36, 1] };

  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <motion.span
        className="absolute left-0 top-[3px] h-[2px] w-5 rounded-full bg-primary"
        initial={{ y: 0, rotate: 0 }}
        animate={open ? { y: 7, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={lineTransition}
      />
      <motion.span
        className="absolute left-0 top-[9px] h-[2px] w-5 rounded-full bg-primary"
        initial={{ opacity: 1 }}
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      />
      <motion.span
        className="absolute left-0 top-[15px] h-[2px] w-5 rounded-full bg-primary"
        initial={{ y: 0, rotate: 0 }}
        animate={open ? { y: -5, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={lineTransition}
      />
    </span>
  );
}

function MobileMenuToggle({ open, submenuOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={submenuOpen ? "Go back" : open ? "Close menu" : "Open menu"}
      className="md:hidden relative z-[110] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded p-2 hover:bg-black/5 transition-colors"
    >
      {submenuOpen ? (
        <ArrowLeft className="h-6 w-6 text-primary" aria-hidden="true" />
      ) : (
        <HamburgerLines open={open} />
      )}
    </button>
  );
}

/* ---------- Animated Mobile slide-out menu ---------- */
function AnimatedMobileMenu({
  items,
  onClose,
  onSubmenuOpenChange,
}) {
  const [activeMenuPath, setActiveMenuPath] = useState([]);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const navigateToSubmenu = useCallback((menu) => {
    setDirection(1);
    setActiveMenuPath((prev) => [...prev, menu]);
  }, []);

  const navigateBack = useCallback(() => {
    setDirection(-1);
    setActiveMenuPath((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    onSubmenuOpenChange?.(activeMenuPath.length > 0);
  }, [activeMenuPath.length, onSubmenuOpenChange]);

  useEffect(() => {
    window.addEventListener("mobile-menu:navigate-back", navigateBack);
    return () => window.removeEventListener("mobile-menu:navigate-back", navigateBack);
  }, [navigateBack]);

  let currentItems = items;
  let currentTitle = "Menu";
  if (activeMenuPath.length > 0) {
    const currentMenu = activeMenuPath[activeMenuPath.length - 1];
    currentItems = currentMenu.items || [];
    currentTitle = currentMenu.title;
  }
  const isMainMenu = activeMenuPath.length === 0;

  // Overlay: premium sliding appearance — fade in + smooth entrance from the left
  const overlayVariants = {
    hidden: {
      opacity: 0,
      x: "-100%",
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
    }
  };

  // Backdrop: subtle page dim behind menu
  const backdropVariants = {
    hidden: { opacity: 0, transition: { duration: 0.3 } },
    visible: { opacity: 1, transition: { duration: 0.4 } }
  };

  // Submenu slide: forward slides right-in, back slides left-in — very smooth
  const menuContainerVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.35, ease: "easeOut" },
        staggerChildren: 0.04,
        delayChildren: 0.08,
      }
    },
    exit: (dir) => ({
      x: dir < 0 ? 60 : -60,
      opacity: 0,
      transition: {
        x: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.25, ease: "easeIn" },
      }
    })
  };

  const itemVariants = {
    enter: { y: 12, opacity: 0 },
    center: { y: 0, opacity: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  };

  const linkBase =
    "montserrat-500 block w-full rounded-lg py-3 text-left text-[15px] leading-6 uppercase tracking-[0.08em] text-[#111] transition-colors hover:text-black/60 sm:text-[16px]";

  return (
    <>
      {/* Dim backdrop */}
      <motion.div
        className="fixed inset-0 z-[80] bg-black/10"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
      />
      {/* Menu container */}
      <motion.div
        className="fixed inset-y-0 left-0 z-[90] flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden bg-white shadow-[12px_0_30px_rgba(0,0,0,0.12)] will-change-transform"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <div className="shrink-0 px-5 pb-3 pt-[72px] sm:px-6">
          <div className="h-6" aria-hidden="true" />
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
          <AnimatePresence custom={direction} mode="wait" initial={false}>
            <motion.div
              key={isMainMenu ? "main" : currentTitle}
              custom={direction}
              variants={menuContainerVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex flex-col overflow-y-auto bg-white px-5 pb-6 pt-2 sm:px-6"
            >
              <nav className="mt-[25%] flex flex-col space-y-1.5">
                {currentItems.map((m) => {
                  const hasChildren = (m.items?.length ?? 0) > 0;

                  return (
                    <motion.div key={m.title} variants={itemVariants}>
                      {hasChildren ? (
                        <button
                          onClick={() => navigateToSubmenu(m)}
                          className={`${linkBase} flex items-center justify-between group`}
                          aria-expanded={false}
                        >
                          <span className="min-w-0 pr-4">{m.title}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 opacity-50 transition-opacity group-hover:opacity-100" />
                        </button>
                      ) : (
                        <Link href={toRelative(m.url)}
                          onClick={onClose}
                          className={linkBase}
                        >
                          {m.title}
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
                {isMainMenu && (
                  <motion.div variants={itemVariants}>
                    <Link href="/track-order"
                      onClick={onClose}
                      className={linkBase}
                    >
                      My Orders
                    </Link>
                  </motion.div>
                )}
              </nav>


            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
