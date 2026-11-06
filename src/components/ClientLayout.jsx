'use client';
import { usePathname } from 'next/navigation';
import { QuickBuyProvider } from '@/context/QuickBuyContext';
import { AuthProvider } from '@/components/context/AuthContext';
import Navbar from './Navbar';
import Marquee from './Marquee';
import Footer from './Footer';
import Testimonial from './home/Testimonial';
import PrBanner from './home/PrBanner';
import WhatsAppButton from './WhatsAppButton';
import QuickBuyDrawer from './Product/QuickBuyDrawer';
import ScrollToTop from '@/utils/ScrollToTop';
import ShopifyCookiesInit from './ShopifyCookiesInit';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith('/products/');
  const isBlogPage = pathname?.startsWith('/blogs/');
  // Testimonial ("Worn & Loved") only makes sense on shopping/discovery pages
  const showTestimonial =
    pathname === '/' ||
    pathname?.startsWith('/collections/') ||
    pathname?.startsWith('/products/');
  return (
    <QuickBuyProvider>
      <AuthProvider>
<ShopifyCookiesInit domain={process.env.NEXT_PUBLIC_SHOP_COOKIE_DOMAIN ?? ''} />
        <ScrollToTop />
        <main className="min-h-screen flex flex-col">
          {!isProductPage && <Marquee />}
          <Navbar />
          <div
            className={isProductPage ? 'md:flex-grow' : 'flex-grow'}
            style={isProductPage ? { minHeight: '100vh' } : undefined}
          >
            {children}
          </div>
          {showTestimonial && <Testimonial />}
          {!isProductPage && !isBlogPage && <PrBanner />}
          <Footer />
          <WhatsAppButton />
          <QuickBuyDrawer />
        </main>
      </AuthProvider>
    </QuickBuyProvider>
  );
}
