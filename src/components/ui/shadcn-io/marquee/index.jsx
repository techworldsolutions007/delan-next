'use client';;
import FastMarquee from 'react-fast-marquee';
import { cn } from '@/lib/utils';

export const Marquee = ({
  className,
  ...props
}) => (
  <div className={cn('relative w-full overflow-hidden', className)} {...props} />
);

export const MarqueeContent = ({
  loop = 0,
  autoFill = true,
  pauseOnHover = true,
  ...props
}) => (
  <FastMarquee autoFill={autoFill} loop={loop} pauseOnHover={pauseOnHover} {...props} />
);

export const MarqueeFade = ({
  className,
  side,
  ...props
}) => (
  <div
    className={cn(
      'absolute top-0 bottom-0 z-10 h-full w-24',
      side === 'left' ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l',
      className
    )}
    {...props} />
);

export const MarqueeItem = ({
  className,
  ...props
}) => (
  <div className={cn('mx-2 flex-shrink-0 object-contain', className)} {...props} />
);
