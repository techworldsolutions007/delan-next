const endpoint = process.env.NEXT_PUBLIC_SHOPIFY_API_ENDPOINT;
const token    = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

export async function shopify(query, variables = {}, nextOptions) {
  if (!endpoint || !token) {
    throw new Error("Missing NEXT_PUBLIC_SHOPIFY_API_ENDPOINT or NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN");
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    ...(nextOptions ? { next: nextOptions } : {}),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response (${res.status}): ${text.slice(0,180)}`); }

  if (!res.ok || json.errors) {
    console.error("Shopify errors:", json.errors || json);
    throw new Error(json.errors?.[0]?.message || `HTTP ${res.status}`);
  }
  return json.data;
}
