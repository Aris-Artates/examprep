"""
trainer.py
Trains XGBoost + LightGBM ensemble on PSHS exam data.
Place your CSV files in /app/data/ before running.

Expected CSV columns:
  math_score, science_score, english_score,
  abstract_reasoning_score, verbal_score,
  total_score, campus_label (0-14 for each PSHS campus)

Run training via: POST http://localhost:8001/train/
"""
import os
import pandas as pd
import numpy as np
from pathlib import Path
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
import optuna
import mlflow

DATA_DIR = Path(os.getenv("MODEL_PATH", "/app/models")).parent / "data"
MODEL_DIR = Path(os.getenv("MODEL_PATH", "/app/models"))

def load_data() -> pd.DataFrame:
    csv_files = list(DATA_DIR.glob("*.csv"))
    if not csv_files:
        print("No CSV files found in /app/data — generating dummy data for testing.")
        return _generate_dummy_data()
    dfs = [pd.read_csv(f) for f in csv_files]
    return pd.concat(dfs, ignore_index=True)

def _generate_dummy_data(n=5000) -> pd.DataFrame:
    """
    Generates realistic dummy PSHS exam data for development.
    Replace with your real 2016-2025 data when available.
    """
    np.random.seed(42)
    data = {
        "math_score": np.random.randint(10, 60, n),
        "science_score": np.random.randint(10, 60, n),
        "english_score": np.random.randint(10, 60, n),
        "abstract_reasoning_score": np.random.randint(10, 60, n),
        "verbal_score": np.random.randint(10, 60, n),
    }
    df = pd.DataFrame(data)
    df["total_score"] = df.sum(axis=1)
    # Higher scorers tend toward Main campus (0), regional campuses for moderate scores
    df["campus_label"] = (df["total_score"].apply(
        lambda s: 0 if s > 220 else (np.random.randint(1, 8) if s > 170 else np.random.randint(5, 15))
    ))
    return df

def engineer_features(df: pd.DataFrame) -> tuple:
    subjects = ["math_score", "science_score", "english_score",
                "abstract_reasoning_score", "verbal_score"]
    for s in subjects:
        df[f"{s}_ratio"] = df[s] / df["total_score"].clip(lower=1)

    feature_cols = subjects + [f"{s}_ratio" for s in subjects] + ["total_score"]
    X = df[feature_cols].values
    y = df["campus_label"].values
    return X, y

def train_model():
    print("Loading data…")
    df = load_data()
    X, y = engineer_features(df)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    mlflow.set_tracking_uri("file:///app/mlruns")

    # ── XGBoost with Optuna tuning ────────────────────────────
    def xgb_objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "max_depth": trial.suggest_int("max_depth", 3, 8),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "use_label_encoder": False,
            "eval_metric": "mlogloss",
            "tree_method": "gpu_hist",   # GPU acceleration
            "random_state": 42,
        }
        model = XGBClassifier(**params)
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
        return model.score(X_test, y_test)

    print("Tuning XGBoost with Optuna (50 trials)…")
    xgb_study = optuna.create_study(direction="maximize")
    xgb_study.optimize(xgb_objective, n_trials=50, show_progress_bar=True)

    best_xgb = XGBClassifier(**xgb_study.best_params, use_label_encoder=False,
                              eval_metric="mlogloss", tree_method="gpu_hist", random_state=42)
    best_xgb.fit(X_train, y_train)

    # ── LightGBM ──────────────────────────────────────────────
    print("Training LightGBM…")
    lgbm = LGBMClassifier(n_estimators=300, learning_rate=0.05,
                          num_leaves=63, device="gpu", random_state=42)
    lgbm.fit(X_train, y_train)

    # ── Evaluate ──────────────────────────────────────────────
    xgb_acc = best_xgb.score(X_test, y_test)
    lgbm_acc = lgbm.score(X_test, y_test)
    print(f"\nXGBoost accuracy: {xgb_acc:.4f}")
    print(f"LightGBM accuracy: {lgbm_acc:.4f}")
    print(classification_report(y_test, best_xgb.predict(X_test)))

    # ── Save models ───────────────────────────────────────────
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_xgb, MODEL_DIR / "xgb_model.joblib")
    joblib.dump(lgbm, MODEL_DIR / "lgbm_model.joblib")
    print(f"Models saved to {MODEL_DIR}")

    # ── Log to MLflow ─────────────────────────────────────────
    with mlflow.start_run():
        mlflow.log_metric("xgb_accuracy", xgb_acc)
        mlflow.log_metric("lgbm_accuracy", lgbm_acc)
        mlflow.log_params(xgb_study.best_params)
        mlflow.sklearn.log_model(best_xgb, "xgb_model")

    return {"xgb_accuracy": xgb_acc, "lgbm_accuracy": lgbm_acc}
