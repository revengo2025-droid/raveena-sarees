"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";

/**
 * Thin gold bar at the top of the page that starts the moment an internal link is clicked and finishes when the new
 * route has rendered. It gives instant feedback on slow connections. A safety timer always ends it, so it can never
 * get stuck.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const last = useRef(pathname);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (hide.current) clearTimeout(hide.current);
      setState("loading");
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(() => setState("idle"), 10_000);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (safety.current) clearTimeout(safety.current);
      if (hide.current) clearTimeout(hide.current);
    };
  }, []);

  // The route changed: finish the bar, then fade it out
  useEffect(() => {
    if (pathname === last.current) return;
    last.current = pathname;
    if (safety.current) clearTimeout(safety.current);
    setState("done");
    hide.current = setTimeout(() => setState("idle"), 450);
  }, [pathname]);

  return (
    <AnimatePresence>
      {state !== "idle" && (
        <m.div
          key="route-progress"
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <m.div
            className="h-full bg-gradient-to-r from-[#C8A24D] via-[#E3C36B] to-[#7A1F2B] shadow-[0_0_10px_rgba(200,162,77,0.6)]"
            initial={{ width: "0%" }}
            animate={state === "done" ? { width: "100%", transition: { duration: 0.25, ease: "easeOut" } } : { width: "85%", transition: { duration: 8, ease: [0.1, 0.6, 0.3, 1] } }}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}
