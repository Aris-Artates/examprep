from fastapi import APIRouter, BackgroundTasks
from services.trainer import train_model

router = APIRouter()

@router.post("/")
async def trigger_training(background_tasks: BackgroundTasks):
    background_tasks.add_task(train_model)
    return {"status": "training started — check /train/status or MLflow UI"}

@router.get("/status")
def training_status():
    from pathlib import Path
    import os
    model_dir = Path(os.getenv("MODEL_PATH", "/app/models"))
    models_exist = (model_dir / "xgb_model.joblib").exists()
    return {"model_trained": models_exist, "model_dir": str(model_dir)}
