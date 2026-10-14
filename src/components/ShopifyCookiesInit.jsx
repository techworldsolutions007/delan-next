'use client';
import { useEffect } from 'react';

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const domain = process.env.NEXT_PUBLIC_SHOP_COOKIE_DOMAIN ?? '';
  const domainPart = domain ? `; domain=${domain}` : '';
  document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/${domainPart}; SameSite=Lax`;
}

function getCookie(name) {
  const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return v ? v.pop() : '';
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ShopifyCookiesInit() {
  useEffect(() => {
    if (!getCookie('_shopify_y')) {
      setCookie('_shopify_y', randomId(), 365);
    }
    if (!getCookie('_shopify_s')) {
      setCookie('_shopify_s', randomId(), 1);
    }
  }, []);
  return null;
}
