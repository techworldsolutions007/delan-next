import AffiliatePage from '@/components/pages/AffiliatePage';

export const metadata = {
  title: 'Affiliate Program',
  description: 'Join the Delan affiliate program — earn commissions by sharing styles you love. Perfect for influencers and fashion enthusiasts.',
  openGraph: {
    title: 'Affiliate Program | Delan',
    description: 'Join the Delan affiliate program — earn commissions by sharing styles you love.',
    type: 'website',
  },
};

export default function Page() {
  return <AffiliatePage />;
}
