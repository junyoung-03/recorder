import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

function AnimatedNumber({ value, duration = 300, formatter = (val) => val, className = '' }) {
  const [displayValue, setDisplayValue] = useState(value || 0);
  const startValueRef = useRef(value || 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayValue(value || 0);
      return undefined;
    }

    const startValue = startValueRef.current;
    const endValue = value || 0;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const nextValue = startValue + (endValue - startValue) * progress;
      setDisplayValue(nextValue);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startValueRef.current = endValue;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{formatter(displayValue)}</span>;
}

export default AnimatedNumber;
