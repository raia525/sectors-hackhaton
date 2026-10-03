"use client";

import { useEffect, useRef } from "react";

/**
 * A figure that counts up from zero each time it scrolls into view.
 *
 * The real value is what the server renders, so the number is correct with
 * no script, for screen readers, and under reduced motion. The count only
 * replaces the text once the element is on screen, and writes to the DOM
 * directly instead of through state, so it costs no re-renders.
 */
export function CountUp({
  value,
  className = "",
  durationMs = 1400,
}: {
  value: number;
  className?: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        // Ease out, so the last digits settle rather than stop dead.
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.round(value * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) run();
        else {
          cancelAnimationFrame(frame);
          el.textContent = "0";
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = String(value);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={`tnum ${className}`}>
      {value}
    </span>
  );
}
