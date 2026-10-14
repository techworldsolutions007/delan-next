import { useCallback, useEffect, useState } from "react";

/**
 * IntersectionObserver-powered hook that tells you when to render a heavy section.
 * Falls back to eager rendering when observers are unavailable (SSR/legacy browsers).
 */
export default function useInViewLoad({
  rootMargin = "200px 0px",
  threshold = 0,
  once = true,
  initialValue = false,
} = {}) {
  const [target, setTarget] = useState(null);
  const [isVisible, setIsVisible] = useState(initialValue);

  useEffect(() => {
    if (isVisible && once) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting || entry?.intersectionRatio > 0) {
          setIsVisible(true);
          if (once) observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [target, rootMargin, threshold, once, isVisible]);

  const ref = useCallback((node) => {
    setTarget(node || null);
  }, []);

  return [ref, isVisible];
}
