"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({ value, decimals = 0, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString()
  );
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      // Small delay so user sees the animation
      setTimeout(() => motionValue.set(value), 100);
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
}
