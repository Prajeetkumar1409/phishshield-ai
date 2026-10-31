import { useEffect, useRef, useState } from 'react';
import { useInView, animate } from 'framer-motion';

/** Animated number. Starts when scrolled into view, or right away with `immediate`. */
export default function CountUp({ value, suffix = '', duration = 1.4, immediate = false }: { value: number; suffix?: string; duration?: number; immediate?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const active = immediate || inView;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    const controls = animate(0, value, { duration, ease: 'easeOut', onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [active, value, duration]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
