# Convertor

A web-based media downloader and converter. Paste a URL from YouTube, Twitter, TikTok, Instagram, or other supported platforms and download it as audio or video in your preferred format.

## Features

- Download from YouTube, Twitter, TikTok, Instagram, and more
- Convert to audio formats: MP3, FLAC, WAV, OGG
- Convert to video formats: MP4, WebM, MKV
- Real-time progress tracking
- Video metadata preview (title, duration, thumbnail)
- Dark / light theme
- Multilingual UI (English, Portuguese, Spanish, French)

## Tech Stack

**Frontend** — Next.js 14, TypeScript, Tailwind CSS, Framer Motion

**Backend** — FastAPI, Python 3.13, yt-dlp, FFmpeg

## Requirements

- Node.js 18+
- Python 3.13
- FFmpeg installed and available in `PATH`

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/convertor.git
cd convertor

# Start both frontend and backend
./start.sh
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8000`.

## Manual Setup

**Backend**
```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --app-dir .
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

| Variable | Location | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8000` | Backend API URL |
| `ALLOWED_ORIGINS` | `backend/.env` | `http://localhost:3000` | CORS whitelist |

## License

MIT
