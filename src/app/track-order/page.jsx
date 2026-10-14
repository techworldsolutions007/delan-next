import TrackOrder from '@/components/TrackOrder';

export const metadata = {
  title: 'Track Your Order',
  description: 'Track your Delan order in real time — enter your order ID or AWB number to get live shipping updates.',
  openGraph: {
    title: 'Track Your Order | Delan',
    description: 'Track your Delan order in real time — enter your order ID or AWB number to get live shipping updates.',
    type: 'website',
  },
};

export default function Page() {
  return <TrackOrder />;
}
