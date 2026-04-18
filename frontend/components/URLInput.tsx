"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, X } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

interface Props {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

function isValidUrl(url: string): boolean {
  return /^https?:\/\/.+\..+/.test(url.trim());
}

export function URLInput({ onSubmit, isLoading }: Props) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const valid = isValidUrl(url.trim());
  const { t } = useLang();

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (trimmed && valid && !isLoading) onSubmit(trimmed);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        if (isValidUrl(text.trim())) {
          setTimeout(() => onSubmit(text.trim()), 60);
        }
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKey}
        placeholder={t("placeholder")}
        disabled={isLoading}
        className="flex-1 bg-transparent text-[13px] outline-none disabled:opacity-40"
        style={{ color: "var(--text)", caretColor: "#00FF66" }}
        autoFocus
      />

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="spin"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="flex-shrink-0"
          >
            <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-dim)" }} />
          </motion.div>
        ) : url && !valid ? (
          <motion.button key="clear"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => { setUrl(""); inputRef.current?.focus(); }}
            className="flex-shrink-0 transition-colors"
            style={{ color: "var(--text-faint)" }}
          >
            <X size={14} />
          </motion.button>
        ) : !url ? (
          <motion.button key="paste"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handlePaste}
            className="flex-shrink-0 text-[10px] font-medium tracking-widest transition-colors"
            style={{ color: "var(--text-faint)" }}
          >
            {t("paste")}
          </motion.button>
        ) : (
          <motion.button key="go"
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={handleSubmit}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#00FF66] flex items-center justify-center text-black shadow-[0_0_12px_rgba(0,255,102,0.35)]"
          >
            <ArrowRight size={13} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
