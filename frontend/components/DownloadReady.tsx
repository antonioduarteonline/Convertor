"use client";

import { motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

interface Props {
  filename: string;
  downloadUrl: string;
  fileSize: number | null;
  onReset: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() ?? "";
}

export function DownloadReady({ filename, downloadUrl, fileSize, onReset }: Props) {
  const { t } = useLang();
  const ext = getExt(filename);
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  return (
    <div className="py-2 space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded border"
            style={{ color: "rgba(0,255,102,0.75)", borderColor: "rgba(0,255,102,0.20)" }}
          >
            {ext}
          </span>
          {fileSize != null && fileSize > 0 && (
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {formatBytes(fileSize)}
            </span>
          )}
        </div>
        <p className="font-medium text-[14px] leading-snug line-clamp-1 mt-1.5" style={{ color: "var(--text)" }}>
          {nameWithoutExt}
        </p>
      </div>

      <div className="flex gap-2">
        <motion.a
          href={downloadUrl}
          download={filename}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
            bg-[#00FF66] text-black font-semibold text-[13px] tracking-wide
            hover:bg-[#00e85c] transition-colors duration-150"
        >
          <Download size={13} strokeWidth={2.5} />
          {t("download")}
        </motion.a>

        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="New"
          className="px-4 rounded-xl border transition-all duration-150"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          }}
        >
          <RotateCcw size={14} />
        </motion.button>
      </div>
    </div>
  );
}
