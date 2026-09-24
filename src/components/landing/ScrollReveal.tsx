"use client";

import { useEffect } from "react";

/**
 * Drives the landing page's scroll animations, in both directions.
 *
 * One IntersectionObserver watches every `[data-reveal]` element and sets its
 * `data-state` to "in", "below" or "above". The CSS in globals.css does the
 * rest: an element leaving past the top is hidden as "above", so scrolling
 * back up brings it in from above, the same way scrolling down brings the next
 * one in from below. A single observer and plain attributes keep the page a
 * server component, with no per-element client code.
 *
 * Nothing is hidden until this runs (the CSS keys off `data-reveal-ready` on
 * <html>), so the page stays fully readable without script, and visitors who
 * ask for reduced motion get the static page.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    // Hide everything not already marked as shown, with transitions off for
    // this one frame, so elements snap to hidden instead of visibly fading out
    // before fading back in.
    root.dataset.revealInit = "";
    root.dataset.revealReady = "";
    for (const el of targets) {
      if (!el.dataset.state) el.dataset.state = "below";
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const top = entry.rootBounds?.top ?? 0;
          const cameFromAbove = entry.boundingClientRect.top < top;
          if (entry.isIntersecting) {
            // A jump (Home key, a link, a fast flick) can skip an element
            // without ever reporting it, leaving it marked "below" while it
            // actually sits above. Snap it to the right side first, with no
            // transition, so it still enters from the direction of travel.
            if (cameFromAbove && el.dataset.state === "below") {
              el.style.transition = "none";
              el.dataset.state = "above";
              void el.offsetHeight;
              el.style.transition = "";
            }
            el.dataset.state = "in";
          } else {
            el.dataset.state = cameFromAbove ? "above" : "below";
          }
        }
      },
      // The bottom margin waits until an element is a little way into view,
      // so its motion is actually seen rather than finishing below the fold.
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        delete root.dataset.revealInit;
        for (const el of targets) observer.observe(el);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      delete root.dataset.revealInit;
      delete root.dataset.revealReady;
    };
  }, []);

  return null;
}
