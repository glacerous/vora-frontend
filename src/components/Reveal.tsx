"use client";

import { motion } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
}

export default function Reveal({
  children,
  delay = 0,
  y = 15,
  duration = 0.5,
  className = "",
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration,
        ease: [0.16, 1, 0.3, 1], // easeOutExpo
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
