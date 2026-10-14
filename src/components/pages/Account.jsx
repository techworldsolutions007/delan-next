'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { shopify } from "@/lib/shopify";
import { useAuth } from "../context/AuthContext";

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// icons
import {
  ExternalLink,
  Package,
  ShoppingBag,
  User as UserIcon,
  Heart,
  Trash,
  Link as LinkIcon,
  MapPin,
  Edit3,
} from "lucide-react";

/* ---------------- GraphQL ---------------- */
const GET_CUSTOMER_ORDERS_AND_WISHLIST = `
  query getCustomerOrdersAndWishlist($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      firstName
      lastName
      email
      createdAt
      phone

      # Default + all addresses (id needed for updates)
      defaultAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      addresses(first: 20) {
        edges {
          node {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
            phone
          }
        }
      }

      wishlist: metafield(namespace: "wishlist", key: "products") {
        type
        value
        references(first: 50) {
          edges {
            node {
              __typename
              ... on Product {
                id
                title
                handle
                featuredImage { url altText }
                priceRange {
                  minVariantPrice { amount currencyCode }
                  maxVariantPrice { amount currencyCode }
                }
              }
            }
          }
        }
      }
      orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            orderNumber
            processedAt
            fulfillmentStatus
            totalPriceV2 { amount currencyCode }
            statusUrl
            lineItems(first: 50) {
              edges {
                node {
                  quantity
                  title
                  variant { image { url altText } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** Edit profile (Shopify Storefront) */
const CUSTOMER_UPDATE = `
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customer { firstName lastName email phone }
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { code field message }
    }
  }
`;

/** Address mutations */
const CUSTOMER_ADDRESS_UPDATE = `
  mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
    customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
      customerAddress { id }
      customerUserErrors { field message }
    }
  }
`;
const CUSTOMER_ADDRESS_CREATE = `
  mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
    customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
      customerAddress { id }
      customerUserErrors { field message }
    }
  }
`;
const CUSTOMER_DEFAULT_ADDRESS_UPDATE = `
  mutation customerDefaultAddressUpdate($customerAccessToken: String!, $addressId: ID!) {
    customerDefaultAddressUpdate(customerAccessToken: $customerAccessToken, addressId: $addressId) {
      customer { defaultAddress { id } }
      customerUserErrors { field message }
    }
  }
`;

// Query nodes by gid ids (Shopify Storefront API supports nodes(ids: [...]))
const GET_NODES_BY_IDS = `
  query getNodesByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        featuredImage { url altText }
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
      }
    }
  }
`;

const WISHLIST_KEY = "wishlistProductIds";

/* ---------------- Helpers ---------------- */
function formatMoney(amount, currency) {
  if (amount == null || currency == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR" }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}
function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
function formatPriceRange(range) {
  if (!range) return "—";
  const min = range.minVariantPrice;
  const max = range.maxVariantPrice;
  if (!min?.amount || !min?.currencyCode) return "—";
  const minFmt = formatMoney(min.amount, min.currencyCode);
  if (!max?.amount || !max?.currencyCode) return minFmt;
  const same = Number(min.amount) === Number(max.amount);
  return same ? minFmt : `${minFmt} – ${formatMoney(max.amount, max.currencyCode)}`;
}
function readLocalWishlistIds() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => String(p));
  } catch {
    return [];
  }
}
function writeLocalWishlistIds(ids = []) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify((ids || []).map(String)));
  } catch {}
}

/* ----------------- Component ----------------- */
export default function Account() {
  const { customerAccessToken, isLoggedIn, authChecked } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState(null);

  const [localWishlistProducts, setLocalWishlistProducts] = useState([]);
  const [localWishlistLoading, setLocalWishlistLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Edit Profile dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [editError, setEditError] = useState("");

  // Edit Address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressForm, setAddressForm] = useState({
    id: null,
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    country: "",
    zip: "",
    phone: "",
    setDefault: true,
  });

  // inline notice
  const [notice, setNotice] = useState("");
  const notify = useCallback((msg) => {
    try { window.clearTimeout(window.__account_notice_timeout); } catch {}
    setNotice(msg);
    window.__account_notice_timeout = window.setTimeout(() => setNotice(""), 2200);
  }, []);

  const fetchCustomerData = useCallback(() => {
    if (!customerAccessToken) return;
    setLoading(true);
    setError("");
    shopify(GET_CUSTOMER_ORDERS_AND_WISHLIST, { customerAccessToken })
      .then((data) => setCustomer(data.customer || null))
      .catch((err) => {
        console.error(err);
        setError(err?.message || "Failed to load account");
      })
      .finally(() => setLoading(false));
  }, [customerAccessToken]);

  const fetchLocalWishlistProducts = useCallback(async () => {
    const ids = readLocalWishlistIds();
    if (!ids.length) {
      setLocalWishlistProducts([]);
      return;
    }
    setLocalWishlistLoading(true);
    try {
      const res = await shopify(GET_NODES_BY_IDS, { ids });
      const nodes = res?.nodes || [];
      const products = nodes.filter(Boolean).map((n) => ({
        id: n.id,
        title: n.title,
        handle: n.handle,
        featuredImage: n.featuredImage || null,
        priceRange: n.priceRange || null,
      }));
      setLocalWishlistProducts(products);
    } catch (e) {
      console.error(e);
      setLocalWishlistProducts([]);
    } finally {
      setLocalWishlistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked && !isLoggedIn) {
      fetchLocalWishlistProducts();
      router.push("/account/login");
      return;
    }
    fetchCustomerData();
    fetchLocalWishlistProducts();
  }, [authChecked, isLoggedIn, router, fetchCustomerData, fetchLocalWishlistProducts]);

  // Sync when wishlist changes elsewhere
  useEffect(() => {
    const onUpdate = () => {
      fetchCustomerData();
      fetchLocalWishlistProducts();
    };
    const onStorage = (e) => {
      if (e.key === WISHLIST_KEY) onUpdate();
    };
    window.addEventListener("wishlist:updated", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wishlist:updated", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [fetchCustomerData, fetchLocalWishlistProducts]);

  const orders = useMemo(
    () => (customer?.orders?.edges || []).map((e) => e.node) || [],
    [customer]
  );

  // addresses list for dialog (handy if you expand later)
  const addresses = useMemo(
    () => (customer?.addresses?.edges || []).map((e) => e.node) || [],
    [customer]
  );

  // Merge server wishlist + local wishlist and dedupe
  const wishlistProducts = useMemo(() => {
    const customerRefs =
      (customer?.wishlist?.references?.edges || [])
        .map((e) => e?.node)
        .filter((n) => n?.__typename === "Product")
        .map((p) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          featuredImage: p.featuredImage || null,
          priceRange: p.priceRange || null,
        })) || [];

    const all = [...customerRefs, ...(localWishlistProducts || [])];
    const seen = new Set();
    const deduped = [];
    for (const p of all) {
      if (!p?.id) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      deduped.push(p);
    }
    return deduped;
  }, [customer, localWishlistProducts]);

  // actions
  const removeFromLocalWishlist = useCallback(
    (productId) => {
      const ids = readLocalWishlistIds();
      const next = ids.filter((x) => String(x) !== String(productId));
      writeLocalWishlistIds(next);
      window.dispatchEvent(new CustomEvent("wishlist:updated", { detail: { ids: next, removed: productId } }));
      setLocalWishlistProducts((prev) => prev.filter((p) => p.id !== productId));
      notify("Removed from wishlist (local)");
    },
    [notify]
  );

  const clearLocalWishlist = useCallback(() => {
    writeLocalWishlistIds([]);
    window.dispatchEvent(new CustomEvent("wishlist:updated", { detail: { ids: [] } }));
    setLocalWishlistProducts([]);
    setShowClearDialog(false);
    notify("Local wishlist cleared");
  }, [notify]);

  const openStatusUrl = useCallback((url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const copyOrderLink = useCallback(
    async (url) => {
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        notify("Order link copied");
      } catch {
        notify("Couldn't copy link");
      }
    },
    [notify]
  );

  /* ---------- Edit Profile ---------- */
  const openEditProfile = useCallback(() => {
    setEditError("");
    setEditForm({
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
    });
    setShowEditDialog(true);
  }, [customer]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const saveProfile = async (e) => {
    e?.preventDefault?.();
    if (!customerAccessToken) return;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email || "");
    if (!emailOk) {
      setEditError("Please enter a valid email address.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await shopify(CUSTOMER_UPDATE, {
        customerAccessToken,
        customer: {
          firstName: editForm.firstName || "",
          lastName: editForm.lastName || "",
          email: editForm.email || "",
          phone: editForm.phone || null,
        },
      });
      const errs = res?.customerUpdate?.customerUserErrors || [];
      if (errs.length) {
        setEditError(errs.map((e) => e.message).join(" • "));
      } else {
        setShowEditDialog(false);
        notify("Profile updated");
        fetchCustomerData();
      }
    } catch (err) {
      console.error(err);
      setEditError(err?.message || "Could not update profile.");
    } finally {
      setEditSaving(false);
    }
  };

  /* ---------- Edit/Add Address ---------- */
  const openAddressDialog = useCallback(() => {
    setAddressError("");
    const d = customer?.defaultAddress;
    if (d?.id) {
      setAddressForm({
        id: d.id,
        firstName: d.firstName || customer?.firstName || "",
        lastName: d.lastName || customer?.lastName || "",
        address1: d.address1 || "",
        address2: d.address2 || "",
        city: d.city || "",
        province: d.province || "",
        country: d.country || "",
        zip: d.zip || "",
        phone: d.phone || customer?.phone || "",
        setDefault: true,
      });
    } else {
      setAddressForm({
        id: null,
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        address1: "",
        address2: "",
        city: "",
        province: "",
        country: "",
        zip: "",
        phone: customer?.phone || "",
        setDefault: true,
      });
    }
    setShowAddressDialog(true);
  }, [customer]);

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const saveAddress = async (e) => {
    e?.preventDefault?.();
    if (!customerAccessToken) return;

    // basic required fields
    if (!addressForm.firstName || !addressForm.lastName || !addressForm.address1 || !addressForm.city || !addressForm.country || !addressForm.zip) {
      setAddressError("Please fill in first name, last name, address, city, country, and zip.");
      return;
    }
    setAddressSaving(true);
    setAddressError("");
    try {
      let addrId = addressForm.id;

      if (addrId) {
        const res = await shopify(CUSTOMER_ADDRESS_UPDATE, {
          customerAccessToken,
          id: addrId,
          address: {
            firstName: addressForm.firstName,
            lastName: addressForm.lastName,
            address1: addressForm.address1,
            address2: addressForm.address2 || null,
            city: addressForm.city,
            province: addressForm.province || null,
            country: addressForm.country,
            zip: addressForm.zip,
            phone: addressForm.phone || null,
          },
        });
        const errs = res?.customerAddressUpdate?.customerUserErrors || res?.customerAddressUpdate?.userErrors || [];
        if (errs.length) {
          setAddressError(errs.map((e) => e.message).join(" • "));
          setAddressSaving(false);
          return;
        }
      } else {
        const res = await shopify(CUSTOMER_ADDRESS_CREATE, {
          customerAccessToken,
          address: {
            firstName: addressForm.firstName,
            lastName: addressForm.lastName,
            address1: addressForm.address1,
            address2: addressForm.address2 || null,
            city: addressForm.city,
            province: addressForm.province || null,
            country: addressForm.country,
            zip: addressForm.zip,
            phone: addressForm.phone || null,
          },
        });
        const errs = res?.customerAddressCreate?.customerUserErrors || res?.customerAddressCreate?.userErrors || [];
        if (errs.length) {
          setAddressError(errs.map((e) => e.message).join(" • "));
          setAddressSaving(false);
          return;
        }
        addrId = res?.customerAddressCreate?.customerAddress?.id || addrId;
      }

      // If requested, set as default
      if (addressForm.setDefault && addrId) {
        const res2 = await shopify(CUSTOMER_DEFAULT_ADDRESS_UPDATE, {
          customerAccessToken,
          addressId: addrId,
        });
        const errs2 = res2?.customerDefaultAddressUpdate?.customerUserErrors || [];
        if (errs2.length) {
          setAddressError(errs2.map((e) => e.message).join(" • "));
          setAddressSaving(false);
          return;
        }
      }

      setShowAddressDialog(false);
      notify("Address saved");
      fetchCustomerData();
    } catch (err) {
      console.error(err);
      setAddressError(err?.message || "Could not save address.");
    } finally {
      setAddressSaving(false);
    }
  };

  /* ------------------ Render ------------------ */

  if (!authChecked || loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 md:px-6 py-10">
        <div className="grid gap-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-3">
              <Package className="h-5 w-5" /> Error loading account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}. Try refreshing or logging out and back in.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Customer";
  const memberSinceYear = customer?.createdAt ? new Date(customer.createdAt).getFullYear() : null;
  const addr = customer?.defaultAddress;
  const ordersCount = orders.length;
  const wishlistCount = wishlistProducts.length;

  const statusBadgeClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("deliver")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s.includes("ship")) return "bg-sky-100 text-sky-700 border-sky-200";
    if (s.includes("process")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-muted text-foreground/70 border-muted";
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/15 ring-1 ring-primary/30 grid place-items-center text-primary">
            <UserIcon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{fullName}</h1>
            <p className="text-sm md:text-base text-muted-foreground truncate">{customer?.email}</p>
            {memberSinceYear ? (
              <p className="text-xs text-muted-foreground mt-1">Member since {memberSinceYear}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditProfile}><Edit3 className="mr-2 h-4 w-4" />Edit Profile</Button>
            <Button variant="outline" onClick={openAddressDialog}><MapPin className="mr-2 h-4 w-4" />Edit Address</Button>
          </div>
        </div>
        {notice ? <div className="mt-4 inline-flex rounded-md border bg-background/70 px-3 py-1.5 text-xs">{notice}</div> : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-primary/20 bg-card/60 backdrop-blur">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-primary/80">Orders</div>
            <div className="mt-1 text-2xl font-semibold">{ordersCount}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/60 backdrop-blur">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-primary/80">Wishlist</div>
            <div className="mt-1 text-2xl font-semibold">{wishlistCount}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/60 backdrop-blur">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-primary/80">Member since</div>
            <div className="mt-1 text-2xl font-semibold">{memberSinceYear || "—"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-6 grid grid-cols-2 sm:w-auto">
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Profile
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Orders & Wishlist
          </TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="space-y-6">
          {/* Personal Information */}
          <Card className="hover:shadow-sm transition">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-1 block">Full Name</label>
                  <Input value={fullName} readOnly className="bg-muted" />
                </div>
                <div>
                  <label className="text-sm mb-1 block">Email Address</label>
                  <Input value={customer?.email || ""} readOnly className="bg-muted" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-1 block">Phone Number</label>
                  <Input value={customer?.phone || "Not provided"} readOnly className="bg-muted" />
                </div>
                <div>
                  <label className="text-sm mb-1 block">Orders</label>
                  <Input value={`${ordersCount} ${ordersCount === 1 ? "order" : "orders"}`} readOnly className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="hover:shadow-sm transition">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Shipping Address</CardTitle>
              <Button variant="outline" size="sm" onClick={openAddressDialog}><MapPin className="mr-2 h-4 w-4" />Edit</Button>
            </CardHeader>
            <CardContent>
              {addr ? (
                <div className="space-y-1 text-sm leading-6">
                  <div className="font-medium">{addr.firstName || customer?.firstName} {addr.lastName || customer?.lastName}</div>
                  <div>{addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}</div>
                  <div>{addr.city}{addr.province ? `, ${addr.province}` : ""} {addr.zip}</div>
                  <div>{addr.country}</div>
                  {addr.phone ? <div className="text-muted-foreground">{addr.phone}</div> : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No default shipping address on file.
                  <Button variant="link" className="px-1" onClick={openAddressDialog}>Add address</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORDERS + WISHLIST */}
        <TabsContent value="orders" className="space-y-8">
{/* Orders – modern compact cards w/ dark header */}
<section aria-labelledby="orders-heading">
  <div className="mb-3">
    <h3 id="orders-heading" className="text-lg font-semibold">Order History</h3>
    <p className="text-xs text-muted-foreground">Track and manage your orders</p>
  </div>

  {orders.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {orders.map((order) => {
        const total = formatMoney(order.totalPriceV2?.amount, order.totalPriceV2?.currencyCode);
        const dateStr = formatDate(order.processedAt);
        const status = order.fulfillmentStatus || "Unfulfilled";
        const items = order.lineItems?.edges || [];
        const itemsCount = items.reduce((sum, le) => sum + (Number(le.node.quantity) || 0), 0);

        const thumbs = items.map((le) => le?.node?.variant?.image?.url).filter(Boolean);
        const summary =
          items.slice(0, 2).map((le) => `${le.node.title} ×${le.node.quantity}`).join(" • ") +
          (items.length > 2 ? ` • +${items.length - 2} more` : "");

        return (
          <Card key={order.id} className="overflow-hidden rounded-none border shadow-sm py-0!">
            {/* Dark header bar */}
            <div className="flex items-start justify-between p-4 bg-primary text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/10 ring-1 ring-white/15">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">ORD-{String(order.orderNumber).padStart(3, "0")}</div>
                  <div className="text-[11px] text-white/70">
                    {dateStr} • {itemsCount} {itemsCount === 1 ? "item" : "items"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold">{total}</div>
              </div>
            </div>

            {/* Status pill (overlaps under header slightly) */}
            <div className="-mt-3 px-4">
              <Badge
                className={`rounded-full px-2.5 py-1 text-[11px] bg-primary! text-white! font-medium shadow-sm border ${statusBadgeClass(status)}`}
              >
                {status}
              </Badge>
            </div>

            <CardContent className="pt-3 pb-4">
              {/* Items thumbnails + caption */}
              <div className="px-0">
                <div className="text-[12px] font-medium text-primary mb-2">ITEMS</div>
                <div className="flex items-center gap-3">
                  {thumbs.slice(0, 3).map((src, i) => (
                    <Image
                      key={i}
                      src={src}
                      alt=""
                      width={0}
                      height={0}
                      sizes="160px"
                      className="h-40 w-auto rounded-md object-cover ring-1 ring-border"
                    />
                  ))}
                  {thumbs.length === 0 && (
                    <div className="grid h-16 w-16 place-items-center rounded-md bg-muted text-muted-foreground ring-1 ring-border">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                  {thumbs.length > 3 && (
                    <div className="grid h-16 w-16 place-items-center rounded-md bg-muted text-xs ring-1 ring-border">
                      +{thumbs.length - 3}
                    </div>
                  )}
                </div>

                <p className="mt-3 truncate text-[13px] text-muted-foreground">{summary}</p>
              </div>

              {/* Divider */}
              <div className="my-4 border-t" />

              {/* Footer actions */}
              <div className="flex items-center gap-2">
                {order.statusUrl && (
                  <Button
                    className="h-10 flex-1 bg-primary text-white"
                    onClick={() => openStatusUrl(order.statusUrl)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Track Order
                  </Button>
                )}
                {order.statusUrl && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-10 w-10"
                          onClick={() => copyOrderLink(order.statusUrl)}
                          aria-label="Copy tracking link"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy link</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  ) : (
    <Card>
      <CardContent className="py-10 text-center">
        <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <h4 className="mb-1 text-sm font-semibold">No orders yet</h4>
        <p className="mb-3 text-xs text-muted-foreground">
          When you place an order, it will show up here.
        </p>
        <Button size="sm" onClick={() => router.push("/collections/all")}>Start shopping</Button>
      </CardContent>
    </Card>
  )}
</section>





          {/* Wishlist */}
          <section>
            <div className="mb-4">
              <h3 className="text-xl font-semibold">Saved Items</h3>
              <p className="text-sm text-muted-foreground">Your wishlist and saved preferences</p>
            </div>

            {localWishlistLoading && wishlistProducts.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
              </div>
            ) : wishlistProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map((p) => {
                  const price = formatPriceRange(p.priceRange);
                  const img = p.featuredImage;
                  return (
                    <Card key={p.id} className="overflow-hidden rounded-xl group hover:shadow-lg transition bg-card/60 backdrop-blur py-01">
                      <CardContent className="p-0">
                        <div className="relative cursor-pointer" onClick={() => router.push(`/products/${p.handle}`)}>
                          <div className="relative aspect-[4/5] w-full bg-muted">
                            {img?.url ? (
                              <Image
                                src={img.url}
                                alt={img?.altText || p.title}
                                fill
                                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                              />
                            ) : null}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="absolute right-3 top-3 rounded-full"
                                  onClick={(e) => { e.stopPropagation(); removeFromLocalWishlist(p.id); }}
                                  aria-label="Remove from wishlist"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove (local)</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent rounded-b-xl" />
                        </div>

                        <div className="p-4">
                          <div className="font-medium leading-tight line-clamp-2" title={p.title}>{p.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">{price}</div>

                          <div className="mt-4 flex items-center gap-2">
                            <Button className="flex-1" onClick={() => router.push(`/products/${p.handle}`)}>View Product</Button>
                            <Button variant="outline" size="icon" onClick={() => router.push(`/products/${p.handle}`)} aria-label="Open">
                              <Heart className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
                    <Heart className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold mb-1">No items in your wishlist</h4>
                  <p className="text-sm text-muted-foreground">Tap the heart on any product to save it here.</p>
                  <div className="mt-4 flex gap-2 justify-center">
                    <Button onClick={() => router.push("/collections/all")}>Browse products</Button>
                    <Button variant="ghost" onClick={fetchLocalWishlistProducts}>Refresh</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block">First Name</label>
                <Input name="firstName" value={editForm.firstName} onChange={handleEditChange} placeholder="First name" />
              </div>
              <div>
                <label className="text-sm mb-1 block">Last Name</label>
                <Input name="lastName" value={editForm.lastName} onChange={handleEditChange} placeholder="Last name" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block">Email</label>
                <Input type="email" name="email" value={editForm.email} onChange={handleEditChange} placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-sm mb-1 block">Phone</label>
                <Input name="phone" value={editForm.phone || ""} onChange={handleEditChange} placeholder="+91 ..." />
              </div>
            </div>

            {editError ? <div className="text-sm text-destructive">{editError}</div> : null}

            <DialogFooter className="flex gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addressForm.id ? "Edit Address" : "Add Address"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveAddress} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block">First Name</label>
                <Input name="firstName" value={addressForm.firstName} onChange={handleAddressChange} placeholder="First name" />
              </div>
              <div>
                <label className="text-sm mb-1 block">Last Name</label>
                <Input name="lastName" value={addressForm.lastName} onChange={handleAddressChange} placeholder="Last name" />
              </div>
            </div>

            <div>
              <label className="text-sm mb-1 block">Address Line 1</label>
              <Input name="address1" value={addressForm.address1} onChange={handleAddressChange} placeholder="Address line 1" />
            </div>
            <div>
              <label className="text-sm mb-1 block">Address Line 2 (optional)</label>
              <Input name="address2" value={addressForm.address2} onChange={handleAddressChange} placeholder="Apartment, suite, etc." />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm mb-1 block">City</label>
                <Input name="city" value={addressForm.city} onChange={handleAddressChange} placeholder="City" />
              </div>
              <div>
                <label className="text-sm mb-1 block">State / Province</label>
                <Input name="province" value={addressForm.province} onChange={handleAddressChange} placeholder="State / Province" />
              </div>
              <div>
                <label className="text-sm mb-1 block">ZIP / Postal</label>
                <Input name="zip" value={addressForm.zip} onChange={handleAddressChange} placeholder="ZIP / Postal code" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block">Country</label>
                <Input name="country" value={addressForm.country} onChange={handleAddressChange} placeholder="Country" />
              </div>
              <div>
                <label className="text-sm mb-1 block">Phone (optional)</label>
                <Input name="phone" value={addressForm.phone} onChange={handleAddressChange} placeholder="+91 ..." />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="setDefault"
                checked={addressForm.setDefault}
                onChange={handleAddressChange}
                className="h-4 w-4 rounded border-muted-foreground/30"
              />
              Set as default shipping address
            </label>

            {addressError ? <div className="text-sm text-destructive">{addressError}</div> : null}

            <DialogFooter className="flex gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddressDialog(false)} disabled={addressSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={addressSaving}>
                {addressSaving ? "Saving..." : "Save address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* clear wishlist confirm dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear local wishlist?</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">
            Removing all locally saved wishlist items cannot be undone. This removes only items stored in your browser,
            not your account-stored wishlist.
          </p>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
            <Button className="bg-destructive text-white" onClick={clearLocalWishlist}>Clear wishlist</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
