"""
FastAPI application — routes, SSE streaming, file serving.

Endpoints:
  GET  /health                   → liveness probe
  POST /api/info                 → fetch video metadata (no download)
  POST /api/convert              → start a conversion job, returns job_id
  GET  /api/progress/{job_id}    → SSE stream of progress events
  GET  /api/download/{job_id}    → serve the converted file
  DEL  /api/job/{job_id}         → clean up job + temp file
"""

import asyncio
import json
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from downloader import DOWNLOAD_DIR, fetch_video_info, jobs, process_conversion
from models import ConvertRequest, InfoRequest

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Convertor API", version="1.0.0")

# CORS: allow the Vercel frontend (configure via env var in production)
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/info")
async def get_info(request: InfoRequest) -> dict:
    """
    Extract video metadata without downloading.
    Runs yt-dlp in the thread pool to avoid blocking the event loop.
    """
    loop = asyncio.get_running_loop()
    try:
        info = await loop.run_in_executor(None, fetch_video_info, request.url)
        return info
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/convert")
async def convert(request: ConvertRequest) -> dict:
    """
    Kick off a background conversion job.
    Returns immediately with a job_id — the client then opens the SSE stream.
    """
    job_id = str(uuid.uuid4())

    # Initialise job record.  The asyncio.Queue is the channel between the
    # background worker thread and the SSE generator coroutine.
    jobs[job_id] = {
        "status": "processing",
        "queue": asyncio.Queue(),
        "file_path": None,
        "filename": None,
        "error": None,
    }

    # Schedule the conversion as a proper async background task
    asyncio.create_task(process_conversion(job_id, request))

    return {"job_id": job_id}


@app.get("/api/progress/{job_id}")
async def progress_stream(job_id: str) -> StreamingResponse:
    """
    Server-Sent Events stream.

    Protocol:
      Each event is a single JSON line:
        data: {"event": "<type>", "data": {...}}\n\n

      Event types:
        connected  → handshake (sent immediately on open)
        status     → simple status update, no percentage
        progress   → download/conversion progress with % and speed
        done       → conversion finished; data includes filename
        error      → fatal error
        stream_end → sentinel; client should close the EventSource

      Keepalive comments (": keepalive") are sent every 15 s to prevent
      proxies and browsers from closing idle connections.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    queue: asyncio.Queue = jobs[job_id]["queue"]

    async def event_generator():
        # Handshake so the client knows the connection is live
        yield f"data: {json.dumps({'event': 'connected', 'data': {'job_id': job_id}})}\n\n"

        while True:
            try:
                # Block until the next event, but wake every 15 s for keepalive
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
                continue

            if event is None:
                # Sentinel from the worker — stream is finished
                yield f"data: {json.dumps({'event': 'stream_end', 'data': {}})}\n\n"
                return

            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Tell Nginx/Render not to buffer the SSE stream
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/download/{job_id}")
async def download_file(job_id: str) -> FileResponse:
    """Serve the converted file as a binary download."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    if job["status"] != "done":
        raise HTTPException(status_code=400, detail="Job not complete yet")

    file_path = job.get("file_path")
    if not file_path or not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="Output file not found")

    return FileResponse(
        path=file_path,
        filename=job["filename"],
        media_type="application/octet-stream",
    )


@app.delete("/api/job/{job_id}")
async def cleanup_job(job_id: str) -> dict:
    """Remove a job from memory and delete its temporary file."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs.pop(job_id)

    if job.get("file_path"):
        try:
            Path(job["file_path"]).unlink(missing_ok=True)
        except Exception:
            pass

    return {"deleted": True}
