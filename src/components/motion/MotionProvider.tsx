"use client";

import React from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

/**
 * Loads framer-motion's animation features on demand (about 15 kB instead of 35 kB) and honours the visitor's
 * "reduce motion" setting everywhere. Use the lightweight `m` components (not `motion`) beneath it.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
