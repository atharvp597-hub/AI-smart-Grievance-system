from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd

from preprocess import preprocess_text

import train as train_module
from ai_core import load_model_bundle, predict_bundle, build_model_metrics
from config import OUTPUT_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


HOLDOUT = [
    # English
    ("No water supply since yesterday", "Water"),
    ("Street light not working at night near the market", "Public Services"),
    ("Huge pothole on the main road, bike fell", "Roads"),
    ("Garbage not collected for three days", "Sanitation"),
    ("Frequent power outages in the colony", "Electricity"),
    # Hinglish / Roman Hindi
    ("2 din se pani nahi aa raha hai", "Water"),
    ("streetlight kharab hai raat ko andhera ho jata hai", "Public Services"),
    ("road pe bahut bada pothole hai", "Roads"),
    ("garbage pickup nahi hua aaj bhi", "Sanitation"),
    ("bijli kal raat se gayi hui hai", "Electricity"),
    # Hindi Devanagari
    ("कल से पानी नहीं आ रहा है", "Water"),
    ("सड़क पर बड़ा गड्ढा है", "Roads"),
    ("कचरा नहीं उठाया गया", "Sanitation"),
]


def prepare_df(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    # Preprocess texts
    def _prep_row(t: str):
        out = preprocess_text(str(t))
        return pd.Series({"clean": out["text"], "lang": out["language"], "priority_hint": out["priority"]})

    df[["clean", "lang", "priority_hint"]] = df["text"].astype(str).apply(_prep_row)
    if "priority" not in df.columns:
        df["priority"] = df["text"].astype(str).map(lambda t: preprocess_text(str(t))["priority"])
    df = df.drop_duplicates(subset=["clean", "label"]).reset_index(drop=True)
    return df


def train_and_eval(df: pd.DataFrame, name: str, epochs: int = 2) -> dict:
    logger.info("Training ablation branch: %s (n=%d)", name, len(df))
    # speed up for ablation
    train_module.TRAIN_EPOCHS = epochs

    dept_out, dept_metrics = train_module.train_classification_model(df.copy(), label_col="label", output_subdir=f"ablation/{name}/dept_model")
    prio_out, prio_metrics = train_module.train_classification_model(df.copy(), label_col="priority", output_subdir=f"ablation/{name}/priority_model")

    # Evaluate on holdout
    dept_bundle = load_model_bundle(dept_out)
    prio_bundle = load_model_bundle(prio_out)

    y_true_dept = []
    y_pred_dept = []
    y_true_prio = []
    y_pred_prio = []

    for text, true_label in HOLDOUT:
        dept_pred = predict_bundle(dept_bundle, text)
        prio_pred = predict_bundle(prio_bundle, text)
        y_true_dept.append(true_label)
        y_pred_dept.append(dept_pred.label)

        # Map true priority via preprocess (best-effort)
        true_prio = preprocess_text(text)["priority"]
        y_true_prio.append(true_prio)
        y_pred_prio.append(prio_pred.label)

    # encode labels to ints for metrics: use label_encoder from bundle
    # For department
    dept_le = dept_bundle.label_encoder
    # align true labels to encoder classes where possible
    def to_ids(le, items: List[str]):
        ids = []
        for it in items:
            try:
                ids.append(int(le.transform([it])[0]))
            except Exception:
                # if unseen label, map to -1 placeholder
                ids.append(-1)
        return ids

    dept_y_true_ids = to_ids(dept_le, y_true_dept)
    dept_y_pred_ids = to_ids(dept_le, y_pred_dept)

    # Filter out -1 rows for metrics
    valid_idx = [i for i, v in enumerate(dept_y_true_ids) if v >= 0]
    dept_metrics_holdout = build_model_metrics([dept_y_true_ids[i] for i in valid_idx], [dept_y_pred_ids[i] for i in valid_idx]) if valid_idx else {}

    prio_le = prio_bundle.label_encoder
    prio_y_true_ids = to_ids(prio_le, y_true_prio)
    prio_y_pred_ids = to_ids(prio_le, y_pred_prio)
    valid_idx_p = [i for i, v in enumerate(prio_y_true_ids) if v >= 0]
    prio_metrics_holdout = build_model_metrics([prio_y_true_ids[i] for i in valid_idx_p], [prio_y_pred_ids[i] for i in valid_idx_p]) if valid_idx_p else {}

    return {
        "name": name,
        "train_counts": int(len(df)),
        "dept_train_metrics": dept_metrics,
        "prio_train_metrics": prio_metrics,
        "dept_holdout_metrics": dept_metrics_holdout,
        "prio_holdout_metrics": prio_metrics_holdout,
    }


def main():
    root = Path(__file__).parent
    raw = root / "model_mine" / "dataset.csv"
    df = prepare_df(raw)

    english_df = df[df["lang"] == "en"].copy()
    augmented_df = df.copy()

    logger.info("English-only rows: %d, Augmented rows: %d", len(english_df), len(augmented_df))

    results = []
    # small epochs to keep runtime reasonable for CI; change as needed
    results.append(train_and_eval(english_df, "english_only", epochs=2))
    results.append(train_and_eval(augmented_df, "augmented", epochs=2))

    out_path = OUTPUT_DIR / "ablation_report.json"
    out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
