export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cleanInlineStyle(style = "") {
  return String(style)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((rule) => !/^(font|font-family|font-size|line-height|letter-spacing)\s*:/i.test(rule))
    .join("; ");
}

export function normalizeShopifyDescriptionHtml(html = "") {
  const value = String(html || "");
  if (!value) return "";

  if (typeof document !== "undefined" && typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");

    doc.querySelectorAll("*").forEach((el) => {
      const cleanedStyle = cleanInlineStyle(el.getAttribute("style"));
      if (cleanedStyle) {
        el.setAttribute("style", cleanedStyle);
      } else {
        el.removeAttribute("style");
      }

      if (el.tagName === "B") {
        const strong = document.createElement("strong");
        strong.innerHTML = el.innerHTML;
        Array.from(el.attributes).forEach((attr) => {
          strong.setAttribute(attr.name, attr.value);
        });
        el.replaceWith(strong);
      }
    });

    return doc.body.innerHTML;
  }

  return value.replace(
    /\b(font|font-family|font-size|line-height|letter-spacing)\s*:\s*[^;]+;?/gi,
    ""
  );
}

export function getShopifyDescriptionMarkup({ html = "", text = "" } = {}) {
  const source = String(html || "").trim()
    ? html
    : String(text || "").trim()
      ? `<p>${escapeHtml(text)}</p>`
      : "<p>No description available.</p>";

  return normalizeShopifyDescriptionHtml(source);
}
