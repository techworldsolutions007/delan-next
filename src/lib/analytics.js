import {
  sendShopifyAnalytics,
  AnalyticsEventName,
  getClientBrowserParameters,
} from '@shopify/hydrogen-react';

const endpoint = process.env.NEXT_PUBLIC_SHOPIFY_API_ENDPOINT ?? '';
// Library prepends https:// itself — pass domain only, no protocol
const storeDomain = endpoint.split('/api/')[0].replace(/^https?:\/\//, '');
const shopNumericId = process.env.NEXT_PUBLIC_SHOPIFY_STORE_ID ?? '';

export function trackAddToCart({
  productGid,
  variantGid,
  productTitle,
  variantTitle = '',
  price = '0',
  cartId = '',
  quantity = 1,
}) {
  if (!productGid || !variantGid) return;
  try {
    sendShopifyAnalytics(
      {
        eventName: AnalyticsEventName.ADD_TO_CART,
        payload: {
          ...getClientBrowserParameters(),
          hasUserConsent: true,           // required — library exits silently without this
          shopId: `gid://shopify/Shop/${shopNumericId}`,
          currency: 'INR',
          cartId,
          totalValue: parseFloat(price || 0) * quantity,
          products: [
            {
              productGid,
              variantGid,
              name: productTitle ?? '',
              variantName: variantTitle ?? '',
              brand: '',
              price: String(parseFloat(price || 0).toFixed(2)),
              quantity,
            },
          ],
        },
      },
      storeDomain
    );
  } catch (err) {
    console.warn('[analytics] trackAddToCart failed silently:', err?.message);
  }
}
