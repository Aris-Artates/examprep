from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from services.predictor import predict_schools
from services.narrator import generate_narrative
from services.supabase_writer import save_prediction, get_student_name

router = APIRouter()

class PredictRequest(BaseModel):
    attempt_id: str
    user_id: str
    section_scores: dict[str, int]
    total_score: int

@router.post("/predict")
async def predict(payload: PredictRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_prediction_pipeline, payload)
    return {"status": "queued", "attempt_id": payload.attempt_id}

async def run_prediction_pipeline(payload: PredictRequest):
    try:
        print(f"Starting prediction for attempt {payload.attempt_id}")
        student_name = get_student_name(payload.user_id)
        school_compatibility = predict_schools(payload.section_scores, payload.total_score)
        narrative = await generate_narrative(
            section_scores=payload.section_scores,
            total_score=payload.total_score,
            school_compatibility=school_compatibility,
            student_name=student_name,
        )
        save_prediction(
            attempt_id=payload.attempt_id,
            user_id=payload.user_id,
            school_compatibility=school_compatibility,
            narrative=narrative,
        )
        print(f"Saved prediction for attempt {payload.attempt_id}")
    except Exception as e:
        print(f"Prediction pipeline error: {e}")
        import traceback
        traceback.print_exc()
