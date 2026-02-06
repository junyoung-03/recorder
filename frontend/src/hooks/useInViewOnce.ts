import { useEffect, useState } from 'react';

type InViewOptions = {
  threshold?: number;
  rootMargin?: string;
};

export function useInViewOnce(ref: React.RefObject<HTMLElement>, options: InViewOptions = {}) {
  const { threshold = 0.2, rootMargin = '0px 0px -10% 0px' } = options;
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, isInView, threshold, rootMargin]);

  return isInView;
}
