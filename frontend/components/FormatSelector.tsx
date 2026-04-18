"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Video, Download, ChevronDown } from "lucide-react";
import { VideoInfo } from "@/lib/api";
import { useLang } from "@/contexts/LangContext";

const AUDIO_FORMATS = ["mp3", "m4a", "flac", "wav", "opus"] as const;
const VIDEO_FORMATS = ["mp4", "webm", "mkv"] as const;

interface Props {
  videoInfo: VideoInfo;
  onConvert: (mediaType: "audio" | "video", format: string, quality: string) => void;
}

export function FormatSelector({ videoInfo, onConvert }: Props) {
  const { t } = useLang();
  const [tab, setTab] = useState<"audio" | "video">("audio");
  const [audioFmt,     setAudioFmt]     = useState<string>("mp3");
  const [audioQuality, setAudioQuality] = useState<string>("0");
  const [videoFmt,     setVideoFmt]     = useState<string>("mp4");
  const [videoQuality, setVideoQuality] = useState<string>("best");

  const audioQualityOptions = [
    { label: t("bestVbr"), value: "0" },
    { label: "320 kbps",   value: "320" },
    { label: "256 kbps",   value: "256" },
    { label: "192 kbps",   value: "192" },
    { label: "128 kbps",   value: "128" },
  ];

  const videoQualityOptions = [
    { label: t("bestAvailable"), value: "best" },
    ...videoInfo.available_resolutions.map((r) => ({
      label: `${r}p`,
      value: String(r),
    })),
  ];

  const handleConvert = () => {
    if (tab === "audio") {
      onConvert("audio", audioFmt, audioQuality);
    } else {
      onConvert("video", videoFmt, videoQuality);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl border" style={{ background: "var(--surface-active)", borderColor: "var(--border)" }}>
        {(["audio", "video"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className="relative flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-[13px] font-medium transition-colors duration-200"
            style={{ color: tab === tabKey ? "#000000" : "var(--text-dim)" }}
          >
            {tab === tabKey && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-0 rounded-lg"
                style={{ background: "#00FF66" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5 z-10">
              {tabKey === "audio" ? <Music2 size={13} /> : <Video size={13} />}
              {tabKey === "audio" ? t("audio") : t("video")}
            </span>
          </button>
        ))}
      </div>

      {/* Format / quality selects */}
      <AnimatePresence mode="wait">
        {tab === "audio" ? (
          <motion.div
            key="audio-opts"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-2 gap-2"
          >
            <SelectField
              label={t("format")}
              value={audioFmt}
              onChange={setAudioFmt}
              options={AUDIO_FORMATS.map((f) => ({ label: f.toUpperCase(), value: f }))}
            />
            <SelectField
              label={t("quality")}
              value={audioQuality}
              onChange={setAudioQuality}
              options={audioQualityOptions}
            />
          </motion.div>
        ) : (
          <motion.div
            key="video-opts"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-2 gap-2"
          >
            <SelectField
              label={t("format")}
              value={videoFmt}
              onChange={setVideoFmt}
              options={VIDEO_FORMATS.map((f) => ({ label: f.toUpperCase(), value: f }))}
            />
            <SelectField
              label={t("resolution")}
              value={videoQuality}
              onChange={setVideoQuality}
              options={videoQualityOptions}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert button */}
      <motion.button
        onClick={handleConvert}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
          bg-[#00FF66] text-black font-semibold text-[13px]
          hover:bg-[#00CC52] transition-colors duration-200
          shadow-[0_4px_24px_rgba(0,255,102,0.25)]"
      >
        <Download size={15} />
        {t("convertDownload")}
      </motion.button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none cursor-pointer rounded-xl px-3 py-2.5 text-[13px] outline-none border transition-colors duration-150"
          style={{
            background: "var(--surface-active)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    </div>
  );
}
