"""
Core download + conversion logic.

Architecture note:
  yt-dlp is a fully synchronous library. FastAPI is async.
  We bridge this by running yt-dlp inside asyncio's thread pool executor
  (loop.run_in_executor) while using asyncio.run_coroutine_threadsafe to
  send progress events back to the async event loop from inside the thread.

Job lifecycle:
  1. POST /api/convert  → creates a job dict with an asyncio.Queue, returns job_id
  2. asyncio.create_task schedules process_conversion() in the background
  3. GET /api/progress/{job_id} → SSE generator drains the queue
  4. When done or errored, a None sentinel is placed on the queue to close the stream
"""

import asyncio
import re
import tempfile
from pathlib import Path
from typing import Callable, Optional

import yt_dlp

from models import ConvertRequest

# ---------------------------------------------------------------------------
# Global in-memory job registry.
# For multi-worker deployments, replace with Redis.
# ---------------------------------------------------------------------------
jobs: dict = {}

DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "convertor"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_ansi(text: str) -> str:
    """Remove ANSI escape codes that yt-dlp injects into progress strings."""
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def _sanitize_filename(name: str) -> str:
    """Strip characters that are illegal in filenames across major OSes."""
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip()


def _find_output_file(job_id: str, extension: str) -> Optional[Path]:
    """
    Locate the final output file by job_id prefix.
    yt-dlp may sanitise the video title differently than we expect, so we
    scan by prefix rather than constructing the exact filename.
    """
    for candidate in DOWNLOAD_DIR.glob(f"{job_id}_*.{extension}"):
        return candidate
    return None


# ---------------------------------------------------------------------------
# Public: video info (no download)
# ---------------------------------------------------------------------------

def fetch_video_info(url: str) -> dict:
    """
    Extract metadata from a YouTube URL without downloading any media.
    Called via loop.run_in_executor because yt-dlp is synchronous.
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    # Collect unique video resolutions available (for the quality selector)
    resolutions: set[int] = set()
    for fmt in info.get("formats", []):
        height = fmt.get("height")
        if height and fmt.get("vcodec", "none") != "none":
            resolutions.add(height)

    return {
        "title": info.get("title", "Unknown"),
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),        # seconds (int)
        "uploader": info.get("uploader"),
        "view_count": info.get("view_count"),
        "available_resolutions": sorted(resolutions, reverse=True)[:8],
    }


# ---------------------------------------------------------------------------
# Public: orchestrate conversion (async entry point)
# ---------------------------------------------------------------------------

async def process_conversion(job_id: str, request: ConvertRequest) -> None:
    """
    Async orchestrator. Runs the synchronous yt-dlp work inside a thread
    executor, communicating back to the SSE stream via asyncio.Queue.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = jobs[job_id]["queue"]

    # ------------------------------------------------------------------
    # Thread-safe event emitter.
    # yt-dlp progress hooks run in the worker thread, NOT the event loop.
    # asyncio.run_coroutine_threadsafe lets us safely put items onto the
    # asyncio.Queue from that thread.
    # ------------------------------------------------------------------
    def send_event(event: str, data: dict) -> None:
        asyncio.run_coroutine_threadsafe(
            queue.put({"event": event, "data": data}),
            loop,
        )

    try:
        send_event("status", {"message": "Analysing video…", "progress": 2})

        output_template = str(DOWNLOAD_DIR / f"{job_id}_%(title)s.%(ext)s")

        if request.media_type == "audio":
            file_info = await loop.run_in_executor(
                None, _download_audio, job_id, request, output_template, send_event
            )
        else:
            file_info = await loop.run_in_executor(
                None, _download_video, job_id, request, output_template, send_event
            )

        jobs[job_id]["status"] = "done"
        jobs[job_id]["file_path"] = file_info["path"]
        jobs[job_id]["filename"] = file_info["filename"]

        # Use await directly — we are in async context here, NOT in a thread.
        # send_event() uses run_coroutine_threadsafe which schedules on the next
        # loop tick, causing the sentinel (None) to arrive BEFORE the done event.
        file_size = Path(file_info["path"]).stat().st_size

        await queue.put({"event": "done", "data": {
            "message": "Download ready!",
            "progress": 100,
            "filename": file_info["filename"],
            "file_size": file_size,
        }})

    except Exception as exc:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(exc)
        await queue.put({"event": "error", "data": {"message": str(exc)}})

    finally:
        # Sentinel — SSE generator closes the stream when it receives None
        await queue.put(None)


# ---------------------------------------------------------------------------
# Private: progress hook factory
# ---------------------------------------------------------------------------

def _make_progress_hook(
    send_event: Callable,
    phase_offset: float,
    phase_scale: float,
    label: str,
) -> Callable:
    """
    Returns a yt-dlp-compatible progress hook that maps the raw 0-100%
    download progress onto a sub-range of the overall 0-100 progress scale.

    Example: phase_offset=5, phase_scale=70 → maps download % to 5…75.
    This lets us show a single unified progress bar even when yt-dlp
    downloads video and audio streams as separate passes.
    """
    def hook(d: dict) -> None:
        status = d.get("status")

        if status == "downloading":
            raw_pct = _strip_ansi(d.get("_percent_str", "0%")).strip()
            try:
                pct = float(raw_pct.rstrip("%"))
            except ValueError:
                pct = 0.0

            overall = phase_offset + (pct / 100.0) * phase_scale
            speed = _strip_ansi(d.get("_speed_str", "")).strip()
            eta   = _strip_ansi(d.get("_eta_str",   "")).strip()

            send_event("progress", {
                "message":  label,
                "progress": round(overall, 1),
                "speed":    speed,
                "eta":      eta,
            })

        elif status == "finished":
            send_event("progress", {
                "message":  f"{label} — processing…",
                "progress": phase_offset + phase_scale,
            })

    return hook


# ---------------------------------------------------------------------------
# Private: audio download
# ---------------------------------------------------------------------------

def _download_audio(
    job_id: str,
    request: ConvertRequest,
    output_template: str,
    send_event: Callable,
) -> dict:
    """
    Download best-quality audio stream and transcode via ffmpeg.

    Quality mapping:
      "0"   → VBR best (yt-dlp default; ideal for FLAC/WAV since lossless)
      "320" → 320 kbps CBR (MP3/AAC)
      etc.
    """
    lossless = {"flac", "wav", "alac"}
    preferred_quality = "0" if request.format in lossless or request.quality == "best" else request.quality

    hook = _make_progress_hook(send_event, phase_offset=5, phase_scale=72, label="Downloading")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "progress_hooks": [hook],
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": request.format,
            "preferredquality": preferred_quality,
        }],
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
    }

    send_event("status", {"message": "Connecting…", "progress": 3})

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(request.url, download=True)

    send_event("progress", {"message": "Finalising file…", "progress": 90})

    title = _sanitize_filename(info.get("title", "audio"))
    output_file = _find_output_file(job_id, request.format)

    if not output_file:
        raise FileNotFoundError(
            f"Expected .{request.format} output not found in {DOWNLOAD_DIR}. "
            "Check that ffmpeg is installed and accessible."
        )

    return {"path": str(output_file), "filename": f"{title}.{request.format}"}


# ---------------------------------------------------------------------------
# Private: video download
# ---------------------------------------------------------------------------

def _download_video(
    job_id: str,
    request: ConvertRequest,
    output_template: str,
    send_event: Callable,
) -> dict:
    """
    Download best video + best audio streams SEPARATELY, then merge with ffmpeg.

    Why separate streams?
      YouTube serves high-resolution video (1080p, 4K, 8K) as DASH streams
      where video-only and audio-only tracks are in separate files. A naive
      "best" format selector will cap at 720p (the highest combined stream).
      By selecting bestvideo+bestaudio explicitly and letting ffmpeg remux,
      we guarantee maximum quality without re-encoding.

    ffmpeg remux (copy codecs) is near-instant and lossless.
    """
    quality = request.quality
    fmt     = request.format

    # Build format selector with quality constraints and graceful fallbacks
    if quality == "best":
        format_spec = (
            f"bestvideo[ext={fmt}]+bestaudio[ext=m4a]/"
            f"bestvideo+bestaudio[ext=m4a]/"
            f"bestvideo+bestaudio/best"
        )
    else:
        format_spec = (
            f"bestvideo[height<={quality}][ext={fmt}]+bestaudio[ext=m4a]/"
            f"bestvideo[height<={quality}]+bestaudio[ext=m4a]/"
            f"bestvideo[height<={quality}]+bestaudio/"
            f"best[height<={quality}]/best"
        )

    # Two-phase progress tracking: video stream (5–55%), audio stream (55–85%), merge (85–95%)
    phase = {"video_done": False}

    def progress_hook(d: dict) -> None:
        status = d.get("status")

        if status == "downloading":
            raw_pct = _strip_ansi(d.get("_percent_str", "0%")).strip()
            try:
                pct = float(raw_pct.rstrip("%"))
            except ValueError:
                pct = 0.0

            speed = _strip_ansi(d.get("_speed_str", "")).strip()

            if not phase["video_done"]:
                overall = 5 + (pct / 100.0) * 50
                msg = "Downloading video stream…"
            else:
                overall = 55 + (pct / 100.0) * 30
                msg = "Downloading audio stream…"

            send_event("progress", {
                "message":  msg,
                "progress": round(overall, 1),
                "speed":    speed,
            })

        elif status == "finished":
            if not phase["video_done"]:
                phase["video_done"] = True
                send_event("progress", {"message": "Downloading audio stream…", "progress": 55})
            else:
                send_event("progress", {"message": "Merging streams with ffmpeg…", "progress": 85})

    ydl_opts = {
        "format": format_spec,
        "outtmpl": output_template,
        "progress_hooks": [progress_hook],
        "merge_output_format": fmt,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
    }

    send_event("status", {"message": "Connecting…", "progress": 3})

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(request.url, download=True)

    send_event("progress", {"message": "Finalising file…", "progress": 95})

    title = _sanitize_filename(info.get("title", "video"))
    output_file = _find_output_file(job_id, fmt)

    if not output_file:
        raise FileNotFoundError(
            f"Expected .{fmt} output not found in {DOWNLOAD_DIR}. "
            "Check that ffmpeg is installed and accessible."
        )

    return {"path": str(output_file), "filename": f"{title}.{fmt}"}
