from fastapi import APIRouter, Query
from services.supabase_client import get_supabase

router = APIRouter()

@router.get("/")
async def get_questions(subject: str = Query(None), limit: int = Query(60)):
    supabase = get_supabase()
    query = supabase.table("questions").select("id,question_text,options,subject,difficulty")
    if subject:
        query = query.eq("subject", subject)
    result = query.limit(limit).execute()
    return result.data

@router.get("/subjects")
async def get_subjects():
    return ["mathematics", "science", "english", "abstract_reasoning", "verbal"]
