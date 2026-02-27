from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, train
import os
from dotenv import load_dotenv

# load environment variables from .env when running outside Docker
load_dotenv()

app = FastAPI(title="ExamPrep AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, tags=["predict"])
app.include_router(train.router, prefix="/train", tags=["train"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
