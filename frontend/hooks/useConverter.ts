"use client";

/**
 * useConverter — central state machine for the conversion flow.
 *
 * States:
 *   idle          → waiting for user to paste a URL
 *   fetching_info → GET /api/info in flight
 *   selecting     → info loaded; user is picking format/quality
 *   converting    → SSE stream is open; progress is updating
 *   done          → file is ready for download
 *   error         → something went wrong; user can reset
 *
 * The hook owns the EventSource lifecycle: it creates it when a conversion
 * starts and closes it when the job finishes, errors, or the component unmounts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cleanupJob,
  ConvertPayload,
  createProgressStream,
  fetchVideoInfo,
  getDownloadUrl,
  startConversion,
  VideoInfo,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppState =
  | "idle"
  | "fetching_info"
  | "selecting"
  | "converting"
  | "done"
  | "error";

interface ConverterState {
  appState: AppState;
  url: string;
  videoInfo: VideoInfo | null;
  progress: number;
  progressMessage: string;
  speed: string;
  eta: string;
  error: string | null;
  downloadUrl: string | null;
  filename: string | null;
  fileSize: number | null;
  jobId: string | null;
}

const INITIAL_STATE: ConverterState = {
  appState: "idle",
  url: "",
  videoInfo: null,
  progress: 0,
  progressMessage: "",
  speed: "",
  eta: "",
  error: null,
  downloadUrl: null,
  filename: null,
  fileSize: null,
  jobId: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConverter() {
  const [state, setState] = useState<ConverterState>(INITIAL_STATE);
  const esRef = useRef<EventSource | null>(null);

  // Close EventSource on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  // -------------------------------------------------------------------------
  // reset: return to idle, clean up resources
  // -------------------------------------------------------------------------
  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;

    // Fire-and-forget cleanup of the server-side temp file
    if (state.jobId) cleanupJob(state.jobId);

    setState(INITIAL_STATE);
  }, [state.jobId]);

  // -------------------------------------------------------------------------
  // fetchInfo: transitions idle → fetching_info → selecting
  // -------------------------------------------------------------------------
  const fetchInfo = useCallback(async (url: string) => {
    // Close any previous stream if user re-pastes a URL
    esRef.current?.close();
    esRef.current = null;

    setState((s) => ({ ...s, url, appState: "fetching_info", error: null }));

    try {
      const info = await fetchVideoInfo(url);
      setState((s) => ({ ...s, appState: "selecting", videoInfo: info }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load video info";
      setState((s) => ({ ...s, appState: "error", error: msg }));
    }
  }, []);

  // -------------------------------------------------------------------------
  // startDownload: transitions selecting → converting → done | error
  // -------------------------------------------------------------------------
  const startDownload = useCallback(
    async (payload: ConvertPayload) => {
      setState((s) => ({
        ...s,
        appState: "converting",
        progress: 0,
        progressMessage: "Starting…",
        speed: "",
        eta: "",
        error: null,
        downloadUrl: null,
        filename: null,
      }));

      let jobId: string;

      try {
        jobId = await startConversion(payload);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to start conversion";
        setState((s) => ({ ...s, appState: "error", error: msg }));
        return;
      }

      setState((s) => ({ ...s, jobId }));

      // ------------------------------------------------------------------
      // Open the SSE stream.
      //
      // EventSource reconnects automatically on network drop, which is fine
      // for typical use. We close it manually once the job is terminal.
      // ------------------------------------------------------------------
      const es = createProgressStream(jobId);
      esRef.current = es;

      es.onmessage = (ev: MessageEvent) => {
        let parsed: { event: string; data: { message: string; progress: number; speed?: string; eta?: string; filename?: string; file_size?: number } };

        try {
          parsed = JSON.parse(ev.data);
        } catch {
          return; // ignore keepalive comments or malformed frames
        }

        const { event, data } = parsed;

        switch (event) {
          case "status":
          case "progress":
            setState((s) => ({
              ...s,
              progress: data.progress ?? s.progress,
              progressMessage: data.message ?? s.progressMessage,
              speed: data.speed ?? "",
              eta: data.eta ?? "",
            }));
            break;

          case "done":
            es.close();
            esRef.current = null;
            setState((s) => ({
              ...s,
              appState: "done",
              progress: 100,
              progressMessage: "Complete!",
              downloadUrl: getDownloadUrl(jobId),
              filename: data.filename ?? "download",
              fileSize: data.file_size ?? null,
            }));
            break;

          case "error":
            es.close();
            esRef.current = null;
            setState((s) => ({
              ...s,
              appState: "error",
              error: data.message ?? "Conversion failed",
            }));
            break;

          case "stream_end":
            es.close();
            esRef.current = null;
            break;
        }
      };

      es.onerror = () => {
        // Only surface the error if the job hasn't already completed
        setState((s) => {
          if (s.appState === "converting") {
            es.close();
            esRef.current = null;
            return {
              ...s,
              appState: "error",
              error: "Connection to server lost. Please try again.",
            };
          }
          return s;
        });
      };
    },
    []
  );

  return { state, fetchInfo, startDownload, reset };
}
