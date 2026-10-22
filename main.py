
import io
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "skinsight_model.keras"

CLASSES = ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]

app = FastAPI(title="SkinSight API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this before deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

model = tf.keras.models.load_model(MODEL_PATH)


@app.get("/")
def home():
    return {"message": "SkinSight API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG, PNG, or WEBP image."
        )

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be under 10 MB.")

    try:
        image = Image.open(io.BytesIO(content)).convert("RGB")
        image = image.resize((224, 224))
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Invalid image file.")

    array = np.asarray(image, dtype=np.float32)
    array = np.expand_dims(array, axis=0)

    probabilities = model.predict(array, verbose=0)[0]
    best_index = int(np.argmax(probabilities))

    return {
        "predicted_class": CLASSES[best_index],
        "probability": round(float(probabilities[best_index]), 4),
        "probabilities": {
            name: round(float(prob), 4)
            for name, prob in zip(CLASSES, probabilities)
        },
        "disclaimer": (
            "Research prototype only. This result is not a medical diagnosis."
        )
    }
