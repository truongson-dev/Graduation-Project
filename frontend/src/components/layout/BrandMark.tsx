import { useId } from 'react';

type BrandMarkProps = { className?: string };

/** Sharp, scalable blue sparkle mark used throughout the app. */
export function BrandMark({ className = 'h-10 w-10' }: BrandMarkProps) {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className} fill="none">
      <defs>
        <linearGradient id={`${gradientId}-blue`} x1="7" y1="7" x2="55" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#42E5FF" />
          <stop offset=".46" stopColor="#168DF7" />
          <stop offset="1" stopColor="#1746D2" />
        </linearGradient>
        <linearGradient id={`${gradientId}-shine`} x1="9" y1="8" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D6FCFF" />
          <stop offset="1" stopColor="#45CFFF" />
        </linearGradient>
      </defs>
      <path d="M32 1.5c3.6 15.1 9 23.5 30.5 30.5C41 36.2 35.7 43 32 62.5 28.2 43 21.8 36.1 1.5 32 21.8 27.1 28.1 19.4 32 1.5Z" fill={`url(#${gradientId}-blue)`} />
      <path d="M32 1.5c-3.9 17.9-10.2 25.6-30.5 30.5l30.5 1.1V1.5Z" fill={`url(#${gradientId}-shine)`} opacity=".94" />
      <path d="M1.5 32c20.3 4.1 26.7 11 30.5 30.5V33.1L1.5 32Z" fill="#36C8FF" opacity=".84" />
      <path d="M62.5 32C41 25 35.6 16.6 32 1.5v30.8L62.5 32Z" fill="#0872EB" opacity=".72" />
      <path d="M32 62.5c3.7-19.5 9-26.3 30.5-30.5L32 33.1v29.4Z" fill="#1739C2" opacity=".76" />
      <path d="M32 23.4c1.9 5.3 3.3 6.8 8.6 8.6-5.3 1.8-6.7 3.3-8.6 8.6-1.8-5.3-3.3-6.8-8.6-8.6 5.3-1.8 6.8-3.3 8.6-8.6Z" fill="#F4FEFF" />
      <path d="M32 27.4 34.6 32 32 36.6 29.4 32l2.6-4.6Z" fill="#52D9FF" opacity=".8" />
    </svg>
  );
}
