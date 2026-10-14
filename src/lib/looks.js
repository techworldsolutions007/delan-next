// ── GraphQL fragments & queries ──────────────────────────────────────────────

const LOOK_PRODUCT_FIELDS_FRAGMENT = /* GraphQL */ `
  fragment LookProductFields on Product {
    id
    handle
    title
    tags
    availableForSale
    featuredImage { url altText }
    packshot: metafield(namespace: "custom", key: "packshot") {
      reference {
        ... on MediaImage {
          image { url altText }
        }
      }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
    }
    options(first: 10) { id name values }
    variants(first: 50) {
      edges {
        node {
          id
          availableForSale
          selectedOptions { name value }
          price { amount currencyCode }
        }
      }
    }
  }
`;

const LOOK_METAOBJECT_FIELDS_FRAGMENT = /* GraphQL */ `
  fragment LookMetaobjectFields on Metaobject {
    id
    handle
    type
    titleField: field(key: "title") { value }
    imageField: field(key: "image") {
      reference {
        ... on MediaImage {
          image { url altText }
        }
      }
    }
    productsField: field(key: "products") {
      references(first: 6) {
        edges {
          node {
            ... on Product {
              ...LookProductFields
            }
          }
        }
      }
    }
  }
  ${LOOK_PRODUCT_FIELDS_FRAGMENT}
`;

export const GET_LOOK_BY_HANDLE = /* GraphQL */ `
  query GetLookByHandle($handle: String!) {
    metaobject(handle: { handle: $handle, type: "look" }) {
      ...LookMetaobjectFields
    }
  }
  ${LOOK_METAOBJECT_FIELDS_FRAGMENT}
`;

export const GET_LOOKS_LITE = /* GraphQL */ `
  query GetLooksLite {
    metaobjects(type: "look", first: 50) {
      edges {
        node {
          id
          handle
          type
          titleField: field(key: "title") { value }
          productsField: field(key: "products") {
            references(first: 6) {
              edges {
                node {
                  ... on Product {
                    id
                    handle
                    title
                    availableForSale
                    featuredImage { url altText }
                    priceRange {
                      minVariantPrice { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_COMPLEMENTARY_PRODUCTS = /* GraphQL */ `
  query GetComplementaryProducts($productId: ID!) {
    productRecommendations(productId: $productId, intent: COMPLEMENTARY) {
      id
      handle
      title
      availableForSale
      featuredImage { url altText }
      priceRange {
        minVariantPrice { amount currencyCode }
      }
      variants(first: 1) {
        edges {
          node {
            id
            availableForSale
          }
        }
      }
    }
  }
`;

// Inline selection to splice into any Collection query body
export const COLLECTION_LOOKS_SELECTION = /* GraphQL */ `
  looks: metafield(namespace: "custom", key: "looks") {
    references(first: 50) {
      edges {
        node {
          ... on Metaobject {
            id
            handle
            type
            titleField: field(key: "title") { value }
            imageField: field(key: "image") {
              reference {
                ... on MediaImage {
                  image { url altText }
                }
              }
            }
            productsField: field(key: "products") {
              references(first: 6) {
                edges {
                  node {
                    ... on Product {
                      id
                      handle
                      title
                      tags
                      availableForSale
                      featuredImage { url altText }
                      packshot: metafield(namespace: "custom", key: "packshot") {
                        reference {
                          ... on MediaImage {
                            image { url altText }
                          }
                        }
                      }
                      priceRange {
                        minVariantPrice { amount currencyCode }
                      }
                      options(first: 10) { id name values }
                      variants(first: 50) {
                        edges {
                          node {
                            id
                            availableForSale
                            selectedOptions { name value }
                            price { amount currencyCode }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ── Normalisation helpers ────────────────────────────────────────────────────

function normalizeProduct(node) {
  if (!node) return null;
  const packshotImg = node.packshot?.reference?.image;
  const imageUrl = packshotImg?.url || node.featuredImage?.url || null;
  const imageAlt = packshotImg?.altText || node.featuredImage?.altText || node.title || '';
  const variants = (node.variants?.edges ?? []).map((e) => e.node);
  const available = node.availableForSale ?? variants.some((v) => v.availableForSale);
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    tags: node.tags ?? [],
    availableForSale: available,
    imageUrl,
    imageAlt,
    priceRange: node.priceRange,
    options: node.options ?? [],
    variants,
  };
}

function normalizeLookNode(node) {
  if (!node) return null;
  const title = node.titleField?.value || '';
  const imageRef = node.imageField?.reference?.image;
  const image = imageRef ? { url: imageRef.url, altText: imageRef.altText || title } : null;
  const products = (node.productsField?.references?.edges ?? [])
    .map((e) => normalizeProduct(e.node))
    .filter(Boolean);
  if (!image || products.length === 0) return null;
  return { id: node.id, handle: node.handle, type: node.type, title, image, products };
}

export function normalizeLooks(collection) {
  const edges = collection?.looks?.references?.edges ?? [];
  return edges.map((e) => normalizeLookNode(e.node)).filter(Boolean);
}

export function normalizeLook_(metaobject) {
  return normalizeLookNode(metaobject);
}

export function formatLookPrice(amount, currency = 'INR') {
  const num = parseFloat(amount ?? 0);
  if (!isFinite(num)) return '₹ 0.00';
  if (currency === 'INR') {
    return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function sumLookMinPrices(look) {
  let total = 0;
  let currency = 'INR';
  for (const p of look?.products ?? []) {
    const amt = parseFloat(p.priceRange?.minVariantPrice?.amount ?? 0);
    if (isFinite(amt)) total += amt;
    currency = p.priceRange?.minVariantPrice?.currencyCode ?? currency;
  }
  return { amount: total.toFixed(2), currency };
}

export function cdnImage(url, width) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(width));
    return u.toString();
  } catch {
    return `${url}${url.includes('?') ? '&' : '?'}width=${width}`;
  }
}

export function cdnSrcSet(url, widths) {
  if (!url) return '';
  return widths.map((w) => `${cdnImage(url, w)} ${w}w`).join(', ');
}

// ── Cart-integration helpers ─────────────────────────────────────────────────

const LOOKS_LITE_CACHE_KEY = 'delan_looks_lite_v1';
const LOOKS_LITE_TTL = 5 * 60 * 1000;

export async function fetchAllLooksLite(shopifyFn, opts = {}) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(LOOKS_LITE_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.ts < LOOKS_LITE_TTL) return cached.data;
  } catch { }

  const data = await shopifyFn(GET_LOOKS_LITE, opts);
  const looks = (data?.metaobjects?.edges ?? []).map((e) => {
    const n = e.node;
    const products = (n.productsField?.references?.edges ?? [])
      .map((pe) => pe.node)
      .filter(Boolean);
    return { id: n.id, handle: n.handle, title: n.titleField?.value || '', products };
  });

  try {
    sessionStorage.setItem(LOOKS_LITE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: looks }));
  } catch { }

  return looks;
}

export function pickLookMatesForCart(cartProductIds, looks) {
  const cartSet = new Set(cartProductIds);
  const seen = new Set();
  const result = [];

  for (const look of looks) {
    const hasCartItem = look.products.some(
      (p) => cartSet.has(p.id) || cartSet.has(p.handle)
    );
    if (!hasCartItem) continue;
    for (const p of look.products) {
      const key = p.id || p.handle;
      if (seen.has(key)) continue;
      if (cartSet.has(p.id) || cartSet.has(p.handle)) continue;
      if (!p.availableForSale) continue;
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

export async function fetchComplementaryForCart(shopifyFn, cartProductIds) {
  const ids = cartProductIds.slice(0, 4);
  if (ids.length === 0) return [];

  const results = await Promise.allSettled(
    ids.map((id) => shopifyFn(GET_COMPLEMENTARY_PRODUCTS, { productId: id }))
  );

  const seen = new Set(cartProductIds);
  const products = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const p of r.value?.productRecommendations ?? []) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      products.push(p);
    }
  }
  return products;
}
