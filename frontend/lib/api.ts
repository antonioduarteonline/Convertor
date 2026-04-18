/**
 * Thin wrapper around the FastAPI backend.
 * Set NEXT_PUBLIC_API_URL in .env.local (dev) or Vercel env vars (prod).
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoInfo {
  title: string;
  thumbnail: string | null;
  duration: number | null;         // seconds
  uploader: string | null;
  view_count: number | null;
  available_resolutions: number[]; // e.g. [2160, 1440, 1080, 720, 480]
}

export interface ConvertPayload {
  url: string;
  media_type: "audio" | "video";
  format: string;
  quality: string;
}

// Shape of each SSE "data" payload (event field varies)
export interface SSEEventData {
  message: string;
  progress: number;
  speed?: string;
  eta?: string;
  filename?: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const res = await fetch(`${API_BASE}/api/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Failed to fetch video info");
  }

  return res.json();
}

export async function startConversion(payload: ConvertPayload): Promise<string> {
  const res = await fetch(`${API_BASE}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Failed to start conversion");
  }

  const data = await res.json();
  return data.job_id as string;
}

/** Returns a native browser EventSource pointed at the SSE progress endpoint. */
export function createProgressStream(jobId: string): EventSource {
  return new EventSource(`${API_BASE}/api/progress/${jobId}`);
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/download/${jobId}`;
}

export async function cleanupJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/api/job/${jobId}`, { method: "DELETE" }).catch(
    () => { /* best-effort cleanup — ignore errors */ }
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatViewCount(count: number | null): string {
  if (!count) return "";
  if (count >= 1_000_000)
    return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000)
    return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}
