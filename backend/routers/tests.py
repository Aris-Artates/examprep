from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.supabase_client import get_supabase
import httpx, os, uuid

router = APIRouter()

class SubmitTestRequest(BaseModel):
    user_id: str
    answers: dict[str, int]           # {question_id: selected_option_index}
    questions: list[dict]              # [{id, subject}]

@router.post("/submit")
async def submit_test(payload: SubmitTestRequest):
    supabase = get_supabase()

    # 1. Fetch correct answers
    question_ids = [q["id"] for q in payload.questions]
    result = supabase.table("questions").select("id,correct_answer,subject").in_("id", question_ids).execute()
    questions_db = {q["id"]: q for q in result.data}

    # 2. Score per subject
    section_scores: dict[str, int] = {}
    for q in payload.questions:
        subject = q["subject"]
        correct = questions_db.get(q["id"], {}).get("correct_answer")
        user_ans = payload.answers.get(q["id"])
        if subject not in section_scores:
            section_scores[subject] = 0
        if user_ans is not None and user_ans == correct:
            section_scores[subject] += 1

    total_score = sum(section_scores.values())

    # 3. Save attempt to Supabase
    attempt_id = str(uuid.uuid4())
    supabase.table("test_attempts").insert({
        "id": attempt_id,
        "user_id": payload.user_id,
        "total_score": total_score,
        "section_scores": section_scores,
        "answers": payload.answers,
    }).execute()

    # 4. Trigger AI service asynchronously
    ai_url = os.getenv("AI_SERVICE_URL", "http://ai:8001")
    # debug: log which URL we're using
    print(f"[DEBUG] AI_SERVICE_URL='{ai_url}' from environment")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{ai_url}/predict", json={
                "attempt_id": attempt_id,
                "user_id": payload.user_id,
                "section_scores": section_scores,
                "total_score": total_score,
            }, timeout=5.0)
            print(f"[DEBUG] AI call status: {response.status_code}")
        except Exception as e:
            print(f"[DEBUG] AI call failed: {e}")
            # AI runs async — don't block the response

    return {"attempt_id": attempt_id, "total_score": total_score, "section_scores": section_scores}

@router.post("/{attempt_id}/retry-ai")
async def retry_ai_prediction(attempt_id: str):
    """Manually retry AI prediction for a stuck attempt"""
    supabase = get_supabase()
    
    # Get the attempt
    attempt_result = supabase.table("test_attempts").select("*").eq("id", attempt_id).single().execute()
    if not attempt_result.data:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    attempt = attempt_result.data
    ai_url = os.getenv("AI_SERVICE_URL", "http://ai:8001")
    
    # Trigger AI service
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{ai_url}/predict", json={
                "attempt_id": attempt_id,
                "user_id": attempt["user_id"],
                "section_scores": attempt["section_scores"],
                "total_score": attempt["total_score"],
            }, timeout=5.0)
            print(f"[DEBUG] Retry AI call status: {response.status_code}")
            return {"status": "queued"}
        except Exception as e:
            print(f"[DEBUG] Retry AI call failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/{attempt_id}")
async def get_attempt(attempt_id: str):
    supabase = get_supabase()
    result = supabase.table("test_attempts").select("*, ai_predictions(*)").eq("id", attempt_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return result.data
