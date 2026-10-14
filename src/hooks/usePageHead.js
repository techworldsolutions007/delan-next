'use client';
import { useEffect } from 'react';

export function usePageHead({ title, description, image, url, type = 'website' } = {}) {
  useEffect(() => {
    if (title) document.title = title;

    const upsert = (attr, attrVal, content) => {
      if (!content) return;
      let el = document.head.querySelector(`meta[${attr}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    upsert('property', 'og:title', title);
    upsert('property', 'og:description', description);
    upsert('property', 'og:image', image);
    upsert('property', 'og:url', url);
    upsert('property', 'og:type', type);
  }, [title, description, image, url, type]);
}
