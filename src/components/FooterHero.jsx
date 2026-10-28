'use client';
import Image from 'next/image';
import ShinyText from './ShinyText';

export default function FooterHero() {
  return (
    <section className="w-full bg-accent py-10">
      <div className="max-w-[1400px] mx-auto min-h-[30vh] px-4 sm:px-6 lg:px-10 grid place-items-center text-center">
        <Image
          src="/images/Delan-logo.svg"
          alt="DELAN brand logo"
          width={280}
          height={95}
          className="w-70 h-auto mx-auto block mb-10"
          priority={false}
        />
        <ShinyText
          text="Own It #TrustYourStyle"
          disabled={false}
          speed={6}
          className="
            block mx-auto text-center
            font-semibold tracking-tight
            leading-none
            text-[clamp(2rem,8vw,7rem)]
            cormorant-garamond-700
            -mt-1 sm:-mt-2
          "
        />
      </div>
    </section>
  );
}
