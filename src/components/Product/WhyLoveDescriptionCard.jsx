'use client';
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getShopifyDescriptionMarkup } from "@/utils/shopifyDescription";

export default function WhyLoveDescriptionCard({
  html = "",
  text = "",
  loading = false,
  error = "",
  alwaysExpanded = false,
  cardClassName = "",
  titleClassName = "",
}) {
  const [expanded, setExpanded] = React.useState(alwaysExpanded);
  const [overflowNeeded, setOverflowNeeded] = React.useState(false);
  const descRef = React.useRef(null);
  const COLLAPSED_PX = 340;

  React.useEffect(() => {
    setExpanded(alwaysExpanded);
  }, [alwaysExpanded]);

  React.useEffect(() => {
    if (alwaysExpanded) {
      setOverflowNeeded(false);
      return;
    }

    const el = descRef.current;
    if (!el) return;

    const check = () => setOverflowNeeded(el.scrollHeight > COLLAPSED_PX + 8);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);

    const imgs = el.querySelectorAll("img");
    imgs.forEach((img) => img.addEventListener("load", check));

    return () => {
      ro.disconnect();
      imgs.forEach((img) => img.removeEventListener("load", check));
    };
  }, [html, text, alwaysExpanded]);

  const markup = getShopifyDescriptionMarkup({ html, text });

  return (
    <Card className={cardClassName}>
      {/* <CardHeader className="px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
        <CardTitle
          className={[
            "cormorant-garamond-700 text-primary",
            "text-[24px] leading-tight sm:text-[28px] lg:text-[30px]",
            "text-left tracking-normal uppercase",
            titleClassName,
          ].join(" ").trim()}
        >
          Why You'll Love This
        </CardTitle>
      </CardHeader> */}

      <CardContent className="pt-2 pb-0">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-9/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8/12 animate-pulse rounded bg-muted" />
          </div>
        ) : error && !String(markup).trim() ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <>
            <div className="relative">
              <div
                ref={descRef}
                className={[
                  "shopify-product-description text-foreground transition-[max-height] duration-500 ease-in-out",
                  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-primary [&_h1]:mt-8 [&_h1]:mb-4",
                  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mt-6 [&_h2]:mb-3",
                  "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mt-4 [&_h3]:mb-2",
                  "[&_h4]:text-base [&_h4]:font-bold [&_h4]:text-primary [&_h4]:mt-3 [&_h4]:mb-1",
                  expanded ? "max-h-[9999px]" : "max-h-[340px] overflow-hidden",
                ].join(" ")}
                dangerouslySetInnerHTML={{ __html: markup }}
              />
              {!expanded && overflowNeeded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
              )}
            </div>

            {!alwaysExpanded && overflowNeeded && (
              <div className="mt-4">
                <Button
                  type="button"
                  className="w-full bg-primary hover:bg-primary/90"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? "Show less" : "Read more"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
