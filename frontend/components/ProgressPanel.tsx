"use client";

import { motion } from "framer-motion";
import { Zap, Clock } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

interface Props {
  progress: number;
  message: string;
  speed?: string;
  eta?: string;
}

export function ProgressPanel({ progress, message, speed, eta }: Props) {
  const { t } = useLang();
  const pct = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            {message || t("processing")}
          </p>
          <div className="flex items-baseline gap-1">
            <motion.span
              className="text-[48px] font-bold leading-none tabular-nums"
              style={{ color: "var(--text)" }}
              key={Math.floor(pct / 2)}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {pct.toFixed(0)}
            </motion.span>
            <span className="text-[20px] font-light" style={{ color: "var(--text-dim)" }}>%</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 pb-1">
          {speed && (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
              <Zap size={9} style={{ color: "rgba(0,255,102,0.6)" }} />
              {speed}
            </span>
          )}
          {eta && (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
              <Clock size={9} />
              {eta}
            </span>
          )}
        </div>
      </div>

      {/* Progress track */}
      <div className="h-px w-full relative overflow-visible" style={{ background: "var(--track)" }}>
        <motion.div
          className="absolute left-0 top-0 h-full"
          style={{ background: "#00FF66" }}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(pct, 0.5)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#00FF66]"
            style={{ boxShadow: "0 0 8px 3px rgba(0,255,102,0.7)" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
