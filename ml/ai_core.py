from __future__ import annotations

import json  # P20 fix: moved from inside save_training_metadata function body
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import joblib
import numpy as np
import torch
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset as TorchDataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer

try:
    # Package-style imports (used when imported as ml.ai_core)
    from .config import MAX_LENGTH, OUTPUT_DIR, SEED
    from .preprocess import assign_priority_label, extract_priority_signals, preprocess_text
except ImportError:
    # Script-style imports (used when running from ml/ directly)
    from config import MAX_LENGTH, OUTPUT_DIR, SEED
    from preprocess import assign_priority_label, extract_priority_signals, preprocess_text


@dataclass(frozen=True)
class ModelBundle:
    model_dir: Path
    tokenizer: AutoTokenizer
    model: AutoModelForSequenceClassification
    label_encoder: object


@dataclass(frozen=True)
class PredictionResult:
    label: str
    confidence: float
    probabilities: List[float]
    top_k: List[Tuple[str, float]]


class ComplaintDataset(TorchDataset):
    def __init__(self, texts: Sequence[str], labels: Sequence[int], tokenizer, max_length: int = MAX_LENGTH):
        self.encodings = tokenizer(
            list(texts),
            truncation=True,
            padding=True,
            max_length=max_length,
            return_tensors="pt",
        )
        self.labels = torch.tensor(list(labels), dtype=torch.long)

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int):
        item = {key: value[idx] for key, value in self.encodings.items()}
        item["labels"] = self.labels[idx]
        return item


def get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def resolve_model_dir(model_dir: Path | str) -> Path:
    resolved = Path(model_dir).resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Model directory not found: {resolved}")
    return resolved


def load_model_bundle(model_dir: Path | str, device: Optional[torch.device] = None) -> ModelBundle:
    resolved_dir = resolve_model_dir(model_dir)
    label_encoder_path = resolved_dir / "label_encoder.joblib"
    if not label_encoder_path.exists():
        raise FileNotFoundError(f"Label encoder not found: {label_encoder_path}")

    runtime_device = device or get_device()
    tokenizer = AutoTokenizer.from_pretrained(str(resolved_dir), trust_remote_code=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        str(resolved_dir),
        trust_remote_code=True,
    ).to(runtime_device)
    label_encoder = joblib.load(label_encoder_path)
    return ModelBundle(model_dir=resolved_dir, tokenizer=tokenizer, model=model, label_encoder=label_encoder)


def top_k_from_probabilities(probabilities: np.ndarray, label_encoder, top_k: int = 3) -> List[Tuple[str, float]]:
    indices = np.argsort(probabilities)[::-1][:top_k]
    labels = label_encoder.inverse_transform(indices)
    return [(str(label), round(float(probabilities[index]), 4)) for index, label in zip(indices, labels)]


def predict_bundle(bundle: ModelBundle, text: str, max_length: int = MAX_LENGTH) -> PredictionResult:
    normalized = preprocess_text(text)["text"]
    inputs = bundle.tokenizer(
        [normalized],
        truncation=True,
        padding=True,
        max_length=max_length,
        return_tensors="pt",
    )

    device = next(bundle.model.parameters()).device
    with torch.no_grad():
        logits = bundle.model(
            input_ids=inputs["input_ids"].to(device),
            attention_mask=inputs["attention_mask"].to(device),
        ).logits

    probabilities = torch.softmax(logits, dim=1).cpu().numpy()[0]
    best_index = int(np.argmax(probabilities))
    best_label = bundle.label_encoder.inverse_transform([best_index])[0]
    confidence = float(probabilities[best_index])
    return PredictionResult(
        label=str(best_label),
        confidence=round(confidence, 4),
        probabilities=[round(float(value), 4) for value in probabilities.tolist()],
        top_k=top_k_from_probabilities(probabilities, bundle.label_encoder),
    )


def split_frame(
    df,
    label_col: str,
    test_size: float = 0.15,
    validation_size: float = 0.15,
    random_state: int = SEED,
):
    if df.empty:
        raise ValueError("Cannot split an empty dataframe")

    remaining_size = max(0.0, 1.0 - test_size)
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=random_state,
        stratify=df[label_col],
    )

    adjusted_validation = validation_size / remaining_size if remaining_size else validation_size
    train_df, val_df = train_test_split(
        train_df,
        test_size=adjusted_validation,
        random_state=random_state,
        stratify=train_df[label_col],
    )

    return train_df, val_df, test_df


def build_model_metrics(y_true: Sequence[int], y_pred: Sequence[int]) -> Dict[str, object]:
    accuracy = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true,
        y_pred,
        average=None,
        zero_division=0,
    )
    macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )
    weighted_precision, weighted_recall, weighted_f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        average="weighted",
        zero_division=0,
    )

    return {
        "accuracy": float(accuracy),
        "macro_precision": float(macro_precision),
        "macro_recall": float(macro_recall),
        "macro_f1": float(macro_f1),
        "weighted_precision": float(weighted_precision),
        "weighted_recall": float(weighted_recall),
        "weighted_f1": float(weighted_f1),
        "per_class": {
            "precision": [float(value) for value in precision.tolist()],
            "recall": [float(value) for value in recall.tolist()],
            "f1": [float(value) for value in f1.tolist()],
            "support": [int(value) for value in support.tolist()],
        },
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def save_training_metadata(output_dir: Path, metadata: Dict[str, object]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    metadata_path = output_dir / "training_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=True), encoding="utf-8")


def compute_low_confidence_flags(confidence: float, threshold: float) -> bool:
    return confidence < threshold


class GrievanceInferenceAdapter:
    def __init__(
        self,
        dept_model_dir: Path | str = OUTPUT_DIR / "dept_model",
        priority_model_dir: Path | str = OUTPUT_DIR / "priority_model",
        low_confidence_threshold: float = 0.55,
        device: Optional[torch.device] = None,
    ):
        self.device = device or get_device()
        self.dept_bundle = load_model_bundle(dept_model_dir, self.device)
        self.priority_bundle = load_model_bundle(priority_model_dir, self.device)
        self.low_confidence_threshold = low_confidence_threshold

    def predict(self, text: str) -> Dict[str, object]:
        preprocessed = preprocess_text(text)
        dept_result = predict_bundle(self.dept_bundle, preprocessed["text"])
        priority_result = predict_bundle(self.priority_bundle, preprocessed["text"])
        severity_signals = extract_priority_signals(text)
        contextual_priority = assign_priority_label(text)

        final_priority = priority_result.label
        final_priority_confidence = priority_result.confidence
        priority_source = "model"

        if contextual_priority == "HIGH" and (
            priority_result.label != "HIGH" or priority_result.confidence < 0.98
        ):
            final_priority = "HIGH"
            final_priority_confidence = round(max(priority_result.confidence, 0.75), 4)
            priority_source = "contextual_override"
        elif contextual_priority == "MEDIUM" and priority_result.label == "LOW" and priority_result.confidence < 0.9:
            final_priority = "MEDIUM"
            final_priority_confidence = round(max(priority_result.confidence, 0.65), 4)
            priority_source = "contextual_blend"

        overall_confidence = float(min(dept_result.confidence, final_priority_confidence))
        is_low_confidence = compute_low_confidence_flags(overall_confidence, self.low_confidence_threshold)

        return {
            "department": dept_result.label,
            "priority": final_priority,
            "confidence": round(overall_confidence, 4),
            "department_confidence": dept_result.confidence,
            "priority_confidence": final_priority_confidence,
            "priority_model_label": priority_result.label,
            "priority_model_confidence": priority_result.confidence,
            "priority_source": priority_source,
            "severity_score": int(severity_signals["score"]),
            "severity_reasons": severity_signals["reasons"],
            "department_top_k": dept_result.top_k,
            "priority_top_k": priority_result.top_k,
            "is_low_confidence": is_low_confidence,
            "needs_manual_review": is_low_confidence,
            "language": preprocessed["language"],
            "normalized_text": preprocessed["text"],
        }


@lru_cache(maxsize=1)
def get_default_adapter() -> GrievanceInferenceAdapter:
    return GrievanceInferenceAdapter()