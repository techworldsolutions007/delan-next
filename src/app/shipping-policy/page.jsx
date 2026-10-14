import ShippingPolicy from '@/components/pages/ShippingPolicy';

export const metadata = {
  title: 'Shipping Policy',
  description: 'Delan\'s shipping policy — fast delivery across India, free shipping on eligible orders, and real-time order tracking.',
  openGraph: {
    title: 'Shipping Policy | Delan',
    description: 'Delan\'s shipping policy — fast delivery across India, free shipping on eligible orders, and real-time order tracking.',
    type: 'website',
  },
};

export default function Page() {
  return <ShippingPolicy />;
}
