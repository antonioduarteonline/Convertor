# ── Stage 1: dependencies ────────────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /app

# ffmpeg is required by yt-dlp for audio extraction and stream merging
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM deps AS runtime

WORKDIR /app

COPY . .

EXPOSE 8000

# Workers=1 is intentional: the in-memory job registry is not shared across
# processes. For multi-worker setups, replace jobs{} with Redis.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
