"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useConverter } from "@/hooks/useConverter";
import { URLInput } from "@/components/URLInput";
import { VideoInfoCard } from "@/components/VideoInfoCard";
import { FormatSelector } from "@/components/FormatSelector";
import { ProgressPanel } from "@/components/ProgressPanel";
import { DownloadReady } from "@/components/DownloadReady";
import { FetchingLoader } from "@/components/FetchingLoader";
import { TopBar } from "@/components/TopBar";
import { useLang } from "@/contexts/LangContext";

function panelKey(appState: string) {
  if (appState === "fetching_info") return "fetching";
  if (appState === "selecting")     return "selecting";
  if (appState === "converting")    return "converting";
  if (appState === "done")          return "done";
  if (appState === "error")         return "error";
  return null;
}

export default function HomePage() {
  const { state, fetchInfo, startDownload, reset } = useConverter();
  const {
    appState, url, videoInfo,
    progress, progressMessage, speed, eta,
    error, downloadUrl, filename, fileSize,
  } = state;

  const { t } = useLang();
  const [inputKey, setInputKey] = useState(0);
  const key = panelKey(appState);

  const handleFetchInfo = (newUrl: string) => fetchInfo(newUrl);
  const handleConvert   = (mediaType: "audio" | "video", format: string, quality: string) =>
    startDownload({ url, media_type: mediaType, format, quality });
  const handleReset     = () => { reset(); setInputKey((k) => k + 1); };

  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <TopBar />

      {/* ── Background ──────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0"
        style={{ backgroundImage: "radial-gradient(circle, var(--dot) 1px, transparent 1px)", backgroundSize: "36px 36px" }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 0%, var(--glow-top) 0%, transparent 70%)" }}
      />
      <motion.div aria-hidden className="pointer-events-none fixed rounded-full"
        style={{ width: 600, height: 600, background: "radial-gradient(circle, var(--glow-orb-green), transparent 65%)", filter: "blur(100px)", top: "-20%", left: "-20%" }}
        animate={{ x: [0, 30, -15, 0], y: [0, -20, 35, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div aria-hidden className="pointer-events-none fixed rounded-full"
        style={{ width: 500, height: 500, background: "radial-gradient(circle, var(--glow-orb-blue), transparent 65%)", filter: "blur(100px)", bottom: "-20%", right: "-20%" }}
        animate={{ x: [0, -30, 20, 0], y: [0, 25, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 50%, var(--vignette) 100%)" }}
      />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col gap-10">

        {/* Wordmark */}
        <motion.div className="text-center"
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            convert<span style={{ color: "#00FF66" }}>or</span>
          </h1>
          <p className="text-[12px] mt-1.5 tracking-wide" style={{ color: "var(--text-muted)" }}>
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          layout
          transition={{ layout: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 16, background: "var(--surface)", borderColor: "var(--border)" }}
          className="w-full border overflow-hidden"
        >
          {/* URL input */}
          <div className="px-5 py-4">
            <URLInput key={inputKey} onSubmit={handleFetchInfo} isLoading={appState === "fetching_info"} />
          </div>

          {/* Panel */}
          {key && (
            <motion.div
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
            >
              <div className="h-px mx-5" style={{ background: "var(--divider)" }} />
              <div className="px-5 py-5">

                {appState === "fetching_info" && <FetchingLoader />}

                {appState === "selecting" && videoInfo && (
                  <div className="space-y-4">
                    <VideoInfoCard info={videoInfo} />
                    <FormatSelector videoInfo={videoInfo} onConvert={handleConvert} />
                  </div>
                )}

                {appState === "converting" && (
                  <ProgressPanel
                    progress={progress}
                    message={progressMessage}
                    speed={speed}
                    eta={eta}
                  />
                )}

                {appState === "done" && downloadUrl && filename && (
                  <DownloadReady
                    filename={filename}
                    downloadUrl={downloadUrl}
                    fileSize={fileSize}
                    onReset={handleReset}
                  />
                )}

                {appState === "error" && (
                  <div className="flex items-start gap-3">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--error-icon)" }} />
                    <p className="flex-1 text-[13px] leading-relaxed" style={{ color: "var(--error-text)" }}>{error}</p>
                    <button
                      onClick={handleReset}
                      className="flex-shrink-0 transition-colors"
                      style={{ color: "var(--text-faint)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Format pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.25 }}
        >
          {["MP3", "FLAC", "WAV", "OGG", "MP4", "WEBM", "MKV"].map((fmt) => (
            <span key={fmt} className="text-[10px] tracking-[0.1em] font-medium" style={{ color: "var(--text-faint)" }}>
              {fmt}
            </span>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
