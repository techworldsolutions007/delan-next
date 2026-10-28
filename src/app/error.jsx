'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <h1 className="cormorant-garamond-700 text-primary text-4xl md:text-5xl uppercase mb-4">
        Something went wrong
      </h1>
      <p className="montserrat-400 text-gray-600 mb-8 max-w-md">
        We ran into an unexpected issue. Please try again or return to the homepage.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-white rounded-full text-sm montserrat-600 uppercase tracking-widest hover:opacity-90 transition"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-primary text-primary rounded-full text-sm montserrat-600 uppercase tracking-widest hover:bg-primary/5 transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
