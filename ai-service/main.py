import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from faster_whisper import WhisperModel

app = FastAPI(title="Whisper Transcription Service")
model_name = os.getenv("WHISPER_MODEL", "tiny")
model = None

def get_model():
    global model
    if model is None:
        # CPU/int8 keeps the starter deployment relatively lightweight.
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
    return model

@app.get("/health")
def health():
    return {"status": "ok", "model": model_name}

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Audio filename is missing")
    suffix = os.path.splitext(file.filename)[1] or ".webm"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(await file.read())
            temp_path = temp.name
        whisper = get_model()
        segments, info = whisper.transcribe(temp_path, beam_size=1, vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text": text, "language": info.language, "language_probability": info.language_probability}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(exc)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
