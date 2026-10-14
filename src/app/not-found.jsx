'use client';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found</p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold uppercase tracking-widest hover:opacity-90 transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
