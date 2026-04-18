"use client";

import { motion } from "framer-motion";
import { Clock, Eye, User } from "lucide-react";
import Image from "next/image";
import { VideoInfo, formatDuration, formatViewCount } from "@/lib/api";

interface Props {
  info: VideoInfo;
}

export function VideoInfoCard({ info }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 p-3.5 rounded-2xl border"
      style={{ background: "var(--surface-active)", borderColor: "var(--border)" }}
    >
      {/* Thumbnail */}
      {info.thumbnail && (
        <div className="relative flex-shrink-0 w-28 h-[70px] rounded-xl overflow-hidden" style={{ background: "var(--surface-hover)" }}>
          <Image
            src={info.thumbnail}
            alt={info.title}
            fill
            sizes="112px"
            className="object-cover"
            unoptimized
          />
          {info.duration && (
            <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono leading-none">
              {formatDuration(info.duration)}
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-col justify-center gap-1.5 min-w-0">
        <p className="font-semibold text-[13px] leading-snug line-clamp-2" style={{ color: "var(--text)" }}>
          {info.title}
        </p>

        <div className="flex flex-wrap items-center gap-2.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
          {info.uploader && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {info.uploader}
            </span>
          )}
          {info.view_count != null && (
            <span className="flex items-center gap-1">
              <Eye size={10} />
              {formatViewCount(info.view_count)}
            </span>
          )}
          {info.duration && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDuration(info.duration)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
