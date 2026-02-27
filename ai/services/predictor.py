import os
import numpy as np
import joblib
from pathlib import Path

MODEL_DIR = Path(os.getenv("MODEL_PATH", "/app/models"))

PSHS_CAMPUSES = [
    {"name": "PSHS Main Campus (Quezon City)", "region": "NCR"},
    {"name": "PSHS Ilocos Region Campus", "region": "Region I"},
    {"name": "PSHS Cagayan Valley Campus", "region": "Region II"},
    {"name": "PSHS Central Luzon Campus", "region": "Region III"},
    {"name": "PSHS CALABARZON Campus", "region": "Region IV-A"},
    {"name": "PSHS Bicol Region Campus", "region": "Region V"},
    {"name": "PSHS Western Visayas Campus", "region": "Region VI"},
    {"name": "PSHS Central Visayas Campus", "region": "Region VII"},
    {"name": "PSHS Eastern Visayas Campus", "region": "Region VIII"},
    {"name": "PSHS Zamboanga Peninsula Campus", "region": "Region IX"},
    {"name": "PSHS Northern Mindanao Campus", "region": "Region X"},
    {"name": "PSHS Davao Region Campus", "region": "Region XI"},
    {"name": "PSHS SOCCSKSARGEN Campus", "region": "Region XII"},
    {"name": "PSHS Caraga Region Campus", "region": "Region XIII"},
    {"name": "PSHS ARMM Campus", "region": "BARMM"},
]

def _load_model():
    xgb_path = MODEL_DIR / "xgb_model.joblib"
    lgbm_path = MODEL_DIR / "lgbm_model.joblib"
    if xgb_path.exists() and lgbm_path.exists():
        return joblib.load(xgb_path), joblib.load(lgbm_path)
    return None, None

def _scores_to_features(section_scores: dict, total_score: int) -> np.ndarray:
    subjects = ["mathematics", "science", "english", "abstract_reasoning", "verbal"]
    features = [section_scores.get(s, 0) for s in subjects]
    features.append(total_score)
    total = max(total_score, 1)
    features += [section_scores.get(s, 0) / total for s in subjects]
    return np.array(features).reshape(1, -1)

def _rule_based_fallback(section_scores: dict, total_score: int) -> list:
    max_score = max(sum(section_scores.values()), 1)
    base_pct = min((total_score / max_score) * 100, 95)
    results = []
    for i, campus in enumerate(PSHS_CAMPUSES):
        adjustment = -15 if i == 0 else (i * 0.5)
        compatibility = max(5, min(95, round(base_pct + adjustment + np.random.uniform(-3, 3))))
        results.append({**campus, "compatibility": compatibility})
    return sorted(results, key=lambda x: -x["compatibility"])

def predict_schools(section_scores: dict, total_score: int) -> list:
    xgb, lgbm = _load_model()
    if xgb is None or lgbm is None:
        print("No trained model found — using rule-based fallback.")
        return _rule_based_fallback(section_scores, total_score)
    features = _scores_to_features(section_scores, total_score)
    xgb_probs = xgb.predict_proba(features)[0]
    lgbm_probs = lgbm.predict_proba(features)[0]
    ensemble_probs = (xgb_probs + lgbm_probs) / 2
    results = []
    for i, campus in enumerate(PSHS_CAMPUSES):
        prob = ensemble_probs[i] if i < len(ensemble_probs) else 0.1
        results.append({**campus, "compatibility": round(prob * 100)})
    return sorted(results, key=lambda x: -x["compatibility"])
