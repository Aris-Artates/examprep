from supabase import create_client
import os
import uuid

def get_supabase():
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

def get_student_name(user_id: str) -> str:
    """Fetch student's full name from profiles table."""
    try:
        supabase = get_supabase()
        result = supabase.table("profiles").select("full_name").eq("id", user_id).single().execute()
        if result.data and result.data.get("full_name"):
            # Return first name only
            return result.data["full_name"].split()[0]
    except Exception as e:
        print(f"Could not fetch student name: {e}")
    return ""

def save_prediction(attempt_id: str, user_id: str, school_compatibility: list, narrative: str):
    supabase = get_supabase()
    supabase.table("ai_predictions").insert({
        "id": str(uuid.uuid4()),
        "attempt_id": attempt_id,
        "user_id": user_id,
        "school_compatibility": school_compatibility,
        "narrative": narrative,
    }).execute()
    print(f"Saved prediction for attempt {attempt_id}")