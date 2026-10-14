/**
 * getProductUGCVideo(product)
 *
 * Extracts the first Shopify-hosted UGC video from product.media.nodes.
 * Prefers mp4 source format when available.
 *
 * @param {Object} product - Shopify product object (must include media.nodes)
 * @returns {{ src: string, poster: string|null, alt: string } | null}
 */
export default function getProductUGCVideo(product) {
  const nodes = product?.media?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return null;

  // Find first Shopify-hosted Video node
  const videoNode = nodes.find(
    (node) =>
      node?.__typename === "Video" || node?.mediaContentType === "VIDEO"
  );

  if (
    !videoNode?.sources ||
    !Array.isArray(videoNode.sources) ||
    videoNode.sources.length === 0
  ) {
    return null;
  }

  // Prefer mp4 source
  const mp4Source = videoNode.sources.find(
    (s) =>
      s?.mimeType?.includes("mp4") || s?.format?.toLowerCase() === "mp4"
  );
  const bestSource = mp4Source || videoNode.sources[0];

  if (!bestSource?.url) return null;

  return {
    src: bestSource.url,
    poster: videoNode.previewImage?.url || null,
    alt: videoNode.alt || product?.title || "Product video",
  };
}
