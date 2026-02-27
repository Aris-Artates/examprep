from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tests, questions, users
from stream import router as stream_router
import os
from dotenv import load_dotenv

# load .env for local development
load_dotenv()

# debug: show key environment settings
print("[DEBUG] ENV SUPABASE_URL=", os.getenv("SUPABASE_URL"))
print("[DEBUG] ENV AI_SERVICE_URL=", os.getenv("AI_SERVICE_URL"))

app = FastAPI(title="ExamPrep Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tests.router, prefix="/api/tests", tags=["tests"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(stream_router, prefix="/api/stream", tags=["stream"])

# Facebook video embed service
from routers import facebook
app.include_router(facebook.router, prefix="/api/facebook", tags=["facebook"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
