import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

export function TopProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(35);

    let timer3: ReturnType<typeof setTimeout> | undefined;

    const timer1 = setTimeout(() => {
      setProgress(80);
    }, 100);

    const timer2 = setTimeout(() => {
      setProgress(100);
      timer3 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 180);
    }, 260);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (timer3) clearTimeout(timer3);
    };
  }, [location.pathname, location.search, location.key]);

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
}
