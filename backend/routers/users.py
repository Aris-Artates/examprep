from fastapi import APIRouter
from services.supabase_client import get_supabase

router = APIRouter()

@router.get("/{user_id}/history")
async def get_user_history(user_id: str):
    supabase = get_supabase()
    result = supabase.table("test_attempts") \
        .select("*, ai_predictions(*)") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()
    return result.data
