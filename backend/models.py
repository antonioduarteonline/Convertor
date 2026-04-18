"""
Pydantic request/response models.
Kept intentionally thin — validation logic lives in the route layer.
"""

from typing import Literal
from pydantic import BaseModel


class InfoRequest(BaseModel):
    url: str


class ConvertRequest(BaseModel):
    url: str
    media_type: Literal["audio", "video"]
    # audio: "mp3" | "m4a" | "flac" | "wav" | "opus"
    # video: "mp4" | "webm" | "mkv"
    format: str
    # audio: "0" (best VBR) | "320" | "256" | "192" | "128"
    # video: "best" | "2160" | "1440" | "1080" | "720" | "480" | "360"
    quality: str
