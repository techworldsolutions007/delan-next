'use client';
import { Suspense, useEffect, useState } from "react";
import PropTypes from "prop-types";
import useInViewLoad from "@/hooks/useInViewLoad";

const DefaultPlaceholder = ({ minHeight, mobileMinHeight }) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth <= 640);
  }, []);
  const resolvedHeight = isMobile && mobileMinHeight ? mobileMinHeight : minHeight;
  return (
    <div
      className="w-full rounded-xl bg-neutral-900/10 dark:bg-neutral-50/5 animate-pulse"
      style={{ minHeight: resolvedHeight }}
      aria-hidden="true"
    />
  );
};

DefaultPlaceholder.propTypes = {
  minHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  mobileMinHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

/**
 * Wraps a lazy-loaded section so its heavy assets only initiate once near the viewport.
 */
export default function LazySection({
  render,
  placeholder,
  minHeight = "50vh",
  mobileMinHeight,
  className = "",
  rootMargin = "200px 0px",
  threshold = 0,
  eager = false,
  once = true,
  id,
  as: Component = "section",
  style,
}) {
  const [setRef, shouldRender] = useInViewLoad({
    rootMargin,
    threshold,
    once,
    initialValue: eager,
  });

  const fallback = placeholder ?? (
    <DefaultPlaceholder minHeight={minHeight} mobileMinHeight={mobileMinHeight} />
  );

  return (
    <Component
      id={id}
      ref={eager ? undefined : setRef}
      className={className}
      style={style}
      aria-busy={!shouldRender}
    >
      {shouldRender ? (
        <Suspense fallback={fallback}>{render()}</Suspense>
      ) : (
        fallback
      )}
    </Component>
  );
}

LazySection.propTypes = {
  render: PropTypes.func.isRequired,
  placeholder: PropTypes.node,
  minHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  mobileMinHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  rootMargin: PropTypes.string,
  threshold: PropTypes.oneOfType([PropTypes.number, PropTypes.arrayOf(PropTypes.number)]),
  eager: PropTypes.bool,
  once: PropTypes.bool,
  id: PropTypes.string,
  as: PropTypes.elementType,
  style: PropTypes.object,
};
