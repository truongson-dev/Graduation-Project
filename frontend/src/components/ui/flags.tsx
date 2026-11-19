import { cn } from '@/core/utils/cn';

export interface FlagProps {
  className?: string;
}

export function VietnamFlag({ className = 'h-3.5 w-5 rounded-[2px]' }: FlagProps) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={cn('inline-block shrink-0 shadow-2xs border border-black/10 overflow-hidden align-middle', className)}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="30" height="20" fill="#da251d" />
      <polygon
        fill="#ff0"
        points="15,4 16.5,8.7 21.4,8.7 17.5,11.5 19,16.2 15,13.3 11,16.2 12.5,11.5 8.6,8.7 13.5,8.7"
      />
    </svg>
  );
}

export function UkFlag({ className = 'h-3.5 w-5 rounded-[2px]' }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={cn('inline-block shrink-0 shadow-2xs border border-black/10 overflow-hidden align-middle', className)}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id="uk-flag-clip">
        <rect width="60" height="30" />
      </clipPath>
      <g clipPath="url(#uk-flag-clip)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30" stroke="#c8102e" strokeWidth="2" />
        <path d="M60,0 L0,30" stroke="#c8102e" strokeWidth="2" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  );
}
