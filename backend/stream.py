from fastapi import APIRouter, HTTPException
import subprocess
import os
import shutil
from typing import Optional

router = APIRouter()

# hardcoded constants
STREAM_KEY = "stream"
RTMP_URL = f"rtmp://localhost/live/{STREAM_KEY}"

# global process holder
_ffmpeg_process: Optional[subprocess.Popen] = None

@router.post("/start-stream")
def start_stream():
    global _ffmpeg_process
    if _ffmpeg_process is not None and _ffmpeg_process.poll() is None:
        raise HTTPException(status_code=400, detail="Stream already running")
    # check sample file exists
    sample = os.path.join(os.path.dirname(__file__), "sample.mp4")
    if not os.path.isfile(sample):
        raise HTTPException(status_code=404, detail="sample.mp4 not found in backend folder")
    
    # find ffmpeg on PATH
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise HTTPException(status_code=500, detail="ffmpeg not found on PATH. Install FFmpeg and restart Python.")
    
    cmd = [
        ffmpeg_path,
        "-re",
        "-i",
        sample,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-f",
        "flv",
        RTMP_URL,
    ]
    try:
        # launch ffmpeg
        _ffmpeg_process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return {"status": "stream started", "rtmp_url": RTMP_URL}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-stream")
def stop_stream():
    global _ffmpeg_process
    if _ffmpeg_process is None or _ffmpeg_process.poll() is not None:
        raise HTTPException(status_code=400, detail="No active stream process")
    try:
        _ffmpeg_process.terminate()
        _ffmpeg_process.wait(timeout=5)
        _ffmpeg_process = None
        return {"status": "stream stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
