"use client";

import { motion } from "framer-motion";

export function FetchingLoader() {
  return (
    <div className="py-2 space-y-4">
      {/* Skeleton */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-24 h-[60px] rounded-lg animate-pulse" style={{ background: "var(--surface-active)" }} />
        <div className="flex flex-col justify-center gap-2.5 flex-1">
          <div className="h-2.5 rounded-full animate-pulse w-full"  style={{ background: "var(--surface-hover)" }} />
          <div className="h-2.5 rounded-full animate-pulse w-2/3"  style={{ background: "var(--surface-active)" }} />
          <div className="h-2   rounded-full animate-pulse w-1/3"  style={{ background: "var(--surface)" }} />
        </div>
      </div>

      {/* Scanning line */}
      <div className="h-px w-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
        <motion.div
          className="h-full bg-gradient-to-r from-transparent via-[#00FF66]/30 to-transparent"
          style={{ width: "40%" }}
          animate={{ x: ["-100%", "350%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
