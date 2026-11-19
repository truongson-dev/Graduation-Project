import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/api/auth';
import illustration404 from '@/assets/images/404-illustration.png';

interface NotFoundPageProps {
  onHome?: () => void;
}

export const NotFoundPage: FC<NotFoundPageProps> = ({ onHome }) => {
  const navigate = useNavigate();
  const me = useMe();
  const homePath = me.data ? '/home' : '/';

  const handleHome = () => {
    if (onHome) {
      onHome();
      return;
    }
    navigate(homePath);
  };

  return (
    <main
      role="main"
      className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-8 antialiased selection:bg-neutral-100 selection:text-black"
    >
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center text-center">
        {/* Cat 404 Illustration */}
        <div className="w-full max-w-[280px] sm:max-w-[320px] mb-6 sm:mb-8 flex justify-center">
          <img
            src={illustration404}
            alt="404 - Cat playing in 404 illustration"
            className="w-full h-auto object-contain select-none pointer-events-none"
            loading="eager"
          />
        </div>

        {/* Heading */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 mb-2 flex items-center justify-center gap-1.5">
          <span>Page Not Found</span>
          <span role="img" aria-label="warning" className="text-lg sm:text-xl">
            ⚠️
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-neutral-600 mb-7 sm:mb-8 font-normal leading-relaxed max-w-xs sm:max-w-sm">
          We couldn't find the page you are looking for
        </p>

        {/* Action Button */}
        <Button
          type="button"
          onClick={handleHome}
          className="h-10 rounded-lg bg-black hover:bg-neutral-800 text-white px-6 text-sm font-medium transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer border-0"
        >
          Back to home page
        </Button>
      </div>
    </main>
  );
};
