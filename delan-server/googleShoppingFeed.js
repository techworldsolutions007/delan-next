// googleShoppingFeed.js
const FEED_CACHE = {
  data: null,
  expiresAt: 0
};

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ADDITIONAL_IMAGES = 10;

/**
 * XML-escape a string for safe embedding in XML text nodes & attributes.
 */
const esc = (s = "") =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/**
 * Strip HTML tags and collapse whitespace.
 */
function stripHtml(html = "") {
  return String(html || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Execute a Shopify Storefront GraphQL query.
 */
async function shopifyGraphQL(query, variables = {}) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const apiVersion = "2025-07";
  const url = `https://${domain}/api/${apiVersion}/graphql.json`;

  if (!token) throw new Error("Missing SHOPIFY_STOREFRONT_TOKEN");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error: ${response.status} ${text}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

/**
 * Paginate through all Shopify products.
 * Fetches up to 50 images + 50 media nodes per product, featured image, and variant images.
 */
async function fetchAllProducts() {
  const query = `
    query getProducts($cursor: String) {
      products(first: 50, after: $cursor) {
        pageInfo { hasNextPage }
        edges {
          cursor
          node {
            id
            title
            handle
            descriptionHtml
            vendor
            productType
            featuredImage {
              url
              altText
            }
            images(first: 50) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            media(first: 50) {
              nodes {
                __typename
                mediaContentType
                alt
                previewImage {
                  url
                }
                ... on MediaImage {
                  image {
                    url
                    altText
                  }
                }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  sku
                  barcode
                  price { amount }
                  compareAtPrice { amount }
                  availableForSale
                  selectedOptions { name value }
                  image { url altText }
                }
              }
            }
          }
        }
      }
    }
  `;

  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data = await shopifyGraphQL(query, { cursor });
    const products = data.products.edges.map(edge => edge.node);
    allProducts = [...allProducts, ...products];
    hasNextPage = data.products.pageInfo.hasNextPage;
    if (hasNextPage) {
      cursor = data.products.edges[data.products.edges.length - 1]?.cursor;
    }
  }

  return allProducts;
}

/**
 * Extract a variant option value by name (case-insensitive).
 */
function getOptionValue(variant, optionName) {
  const opt = (variant.selectedOptions || []).find(
    o => o.name.toLowerCase() === optionName.toLowerCase()
  );
  return opt ? opt.value : null;
}

/**
 * Determine if a product should be excluded from the feed.
 * Filters out banner/dummy products and products missing required data.
 */
function shouldExcludeProduct(product) {
  const title = (product.title || "").trim();
  const handle = (product.handle || "").trim();
  const description = stripHtml(product.descriptionHtml);

  // Empty title or description
  if (!title || !description) return true;

  // Banner / dummy products
  if (handle.toLowerCase().includes("banner")) return true;
  if (title.toLowerCase().includes("banner")) return true;

  // No images at all
  const hasAnyImage =
    product.featuredImage?.url ||
    (product.images?.edges?.length > 0 && product.images.edges[0].node?.url) ||
    (product.media?.nodes?.some(m => m.mediaContentType === "IMAGE"));
  if (!hasAnyImage) return true;

  // All variants have price <= 0
  const variants = product.variants?.edges || [];
  if (variants.length === 0) return true;

  const hasValidPrice = variants.some(
    v => parseFloat(v.node?.price?.amount || 0) > 0
  );
  if (!hasValidPrice) return true;

  return false;
}

/**
 * For a given variant and product, collect all image URLs in the required order.
 * Order: 1. variant image, 2. featured image, 3. product images, 4. media images.
 * Returns { mainImage, additionalImages }.
 */
function collectAllVariantImages(variant, product) {
  const urls = [];
  const seen = new Set();

  const add = (url) => {
    if (!url || typeof url !== "string") return;
    let trimmed = url.trim();
    if (!trimmed) return;
    
    // Ensure HTTPS
    if (trimmed.startsWith("http://")) {
      trimmed = trimmed.replace("http://", "https://");
    }
    
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  // 1. Variant image first
  add(variant.image?.url);

  // 2. Featured image second
  add(product.featuredImage?.url);

  // 3. All product images
  for (const edge of (product.images?.edges || [])) {
    add(edge.node?.url);
  }

  // 4. Media nodes (IMAGE type only)
  for (const node of (product.media?.nodes || [])) {
    if (node.mediaContentType !== "IMAGE") continue;
    const mediaUrl = node.image?.url || node.previewImage?.url;
    add(mediaUrl);
  }

  if (urls.length === 0) return { mainImage: null, additionalImages: [] };

  const mainImage = urls[0];
  const additionalImages = urls.slice(1, MAX_ADDITIONAL_IMAGES + 1);

  return { mainImage, additionalImages, totalCollected: urls.length };
}

/**
 * Build the full RSS/XML feed from the product array.
 */
function buildGoogleFeed(products) {
  const frontendDomain = (process.env.FRONTEND_DOMAIN || "https://delan.in").replace(/\/$/, "");
  let itemsXml = "";

  for (const product of products) {
    // --- Filter out invalid products ---
    if (shouldExcludeProduct(product)) continue;

    for (const variantEdge of (product.variants?.edges || [])) {
      const variant = variantEdge.node;

      // Skip variants with price <= 0
      const price = parseFloat(variant.price?.amount || 0);
      if (price <= 0) continue;

      const priceStr = price.toFixed(2);
      const compareAtPrice = variant.compareAtPrice?.amount
        ? parseFloat(variant.compareAtPrice.amount).toFixed(2)
        : null;

      let priceXml = `<g:price>${esc(priceStr)} INR</g:price>`;
      let salePriceXml = "";

      if (compareAtPrice && parseFloat(compareAtPrice) > price) {
        priceXml = `<g:price>${esc(compareAtPrice)} INR</g:price>`;
        salePriceXml = `\n      <g:sale_price>${esc(priceStr)} INR</g:sale_price>`;
      }

      const availability = variant.availableForSale ? "in_stock" : "out_of_stock";
      const size = getOptionValue(variant, "Size");
      const color = getOptionValue(variant, "Color") || getOptionValue(variant, "Colour");

      const description = stripHtml(product.descriptionHtml).substring(0, 5000);
      const link = `${frontendDomain}/products/${product.handle}`;

      const gid = variant.id.split("/").pop();
      const groupid = product.id.split("/").pop();

      // --- Resolve images per variant ---
      const { mainImage, additionalImages, totalCollected } = collectAllVariantImages(variant, product);
      if (!mainImage) continue;

      // Debug log as requested
      console.log(
        `[FEED DEBUG] "${product.title}" | variant: "${variant.title}" | ` +
        `total collected: ${totalCollected} | main: ${mainImage} | ` +
        `additional count: ${additionalImages.length}`
      );

      // Build additional image XML lines
      const additionalImagesXml = additionalImages
        .map(url => `\n      <g:additional_image_link>${esc(url)}</g:additional_image_link>`)
        .join("");

      // Variant title suffix
      const titleSuffix = variant.title !== "Default Title" ? ` - ${esc(variant.title)}` : "";

      itemsXml += `
    <item>
      <g:id>${esc(gid)}</g:id>
      <g:item_group_id>${esc(groupid)}</g:item_group_id>
      <g:title>${esc(product.title)}${titleSuffix}</g:title>
      <g:description>${esc(description)}</g:description>
      <g:link>${esc(link)}</g:link>
      <g:image_link>${esc(mainImage)}</g:image_link>${additionalImagesXml}
      <g:availability>${availability}</g:availability>
      ${priceXml}${salePriceXml}
      <g:brand>${esc(product.vendor || "DELAN")}</g:brand>
      <g:condition>new</g:condition>
      <g:gender>female</g:gender>
      <g:age_group>adult</g:age_group>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
      ${size ? `<g:size>${esc(size)}</g:size>` : ""}
      ${color ? `<g:color>${esc(color)}</g:color>` : ""}
      ${variant.barcode ? `<g:identifier_exists>yes</g:identifier_exists>\n      <g:gtin>${esc(variant.barcode)}</g:gtin>` : `<g:identifier_exists>no</g:identifier_exists>`}
      ${variant.sku ? `<g:mpn>${esc(variant.sku)}</g:mpn>` : ""}
    </item>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>DELAN Google Shopping Feed</title>
    <link>${esc(frontendDomain)}</link>
    <description>DELAN product feed for Google Merchant Center</description>${itemsXml}
  </channel>
</rss>`;
}

/**
 * Express handler for GET /google-shopping-feed.xml
 */
async function handleGoogleShoppingFeed(req, res) {
  try {
    const now = Date.now();
    if (FEED_CACHE.data && FEED_CACHE.expiresAt > now) {
      console.log("Serving Google Shopping Feed from cache");
    } else {
      console.log("Fetching fresh products for Google Shopping Feed");
      const products = await fetchAllProducts();
      FEED_CACHE.data = buildGoogleFeed(products);
      FEED_CACHE.expiresAt = now + CACHE_DURATION_MS;
    }

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    });
    res.send(FEED_CACHE.data);
  } catch (err) {
    console.error("Error generating Google Shopping feed:", err);
    res.status(500).send("Error generating Google Shopping feed");
  }
}

module.exports = { handleGoogleShoppingFeed };
