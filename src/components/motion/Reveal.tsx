"use client";

import React from "react";
import { m } from "framer-motion";

/**
 * Fades and lifts its content into place the first time it scrolls into view. Use it BELOW the fold only: content at
 * the very top of a page should render immediately (it is what search engines and the first paint see).
 * Must sit inside a <MotionProvider>.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  const Tag = m[as] as typeof m.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

/** Gentle endless float for decorative marks. Disabled automatically when the visitor prefers reduced motion. */
export function Float({ children, className, distance = 10, duration = 5 }: { children: React.ReactNode; className?: string; distance?: number; duration?: number }) {
  return (
    <m.div className={className} animate={{ y: [0, -distance, 0] }} transition={{ duration, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </m.div>
  );
}
