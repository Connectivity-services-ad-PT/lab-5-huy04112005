from fastapi import FastAPI

app = FastAPI(title="AI Service", description="Sample AI service providing a dummy prediction")

@app.post("/predict")
async def predict():
    # Dummy result, can be replaced by actual model (YOLOv8, MediaPipe...)
    return {"result": "dummy", "confidence": 0.99, "model": "mock_ai"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}
