"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang, LANGS } from "@/contexts/LangContext";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-2">
      {/* Theme toggle */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Toggle theme"
        className="w-8 h-8 rounded-xl flex items-center justify-center border transition-colors duration-200"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-dim)",
        }}
      >
        {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
      </motion.button>

      {/* Language selector */}
      <div ref={ref} className="relative">
        <motion.button
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="h-8 px-2.5 rounded-xl flex items-center gap-1.5 border transition-colors duration-200 text-[11px] font-medium tracking-wide"
          style={{
            background: "var(--surface)",
            borderColor: open ? "var(--border-hover)" : "var(--border)",
            color: "var(--text-dim)",
          }}
        >
          <span className="text-[13px] leading-none">{current.flag}</span>
          <span>{current.code.toUpperCase()}</span>
          <ChevronDown
            size={9}
            style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
          />
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.13 }}
              className="absolute right-0 top-full mt-1.5 min-w-[152px] rounded-xl overflow-hidden border"
              style={{
                background: "var(--dropdown-bg)",
                borderColor: "var(--border)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              }}
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-left transition-colors duration-100"
                  style={{
                    color: lang === l.code ? "#00FF66" : "var(--text-dim)",
                    background: lang === l.code ? "rgba(0,255,102,0.07)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (lang !== l.code) {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (lang !== l.code) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
                    }
                  }}
                >
                  <span className="text-[14px] leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
