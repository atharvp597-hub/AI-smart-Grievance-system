import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from config import *
from ai_core import build_model_metrics, load_model_bundle, predict_bundle, split_frame
from preprocess import preprocess_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def evaluate_model(model_dir, texts, labels):
    model_dir = Path(model_dir).resolve()
    bundle = load_model_bundle(model_dir)
    encoded_labels = bundle.label_encoder.transform(np.asarray(labels, dtype=str))

    predictions = []
    confidences = []
    for text in np.asarray(texts, dtype=str):
        result = predict_bundle(bundle, text)
        predictions.append(bundle.label_encoder.transform([result.label])[0])
        confidences.append(result.confidence)

    metrics = build_model_metrics(encoded_labels, predictions)
    metrics['low_confidence_rate'] = float(np.mean(np.asarray(confidences) < 0.55)) if confidences else 0.0
    metrics['avg_confidence'] = float(np.mean(confidences)) if confidences else 0.0
    metrics['label_classes'] = list(bundle.label_encoder.classes_)
    return metrics


def build_difficulty_report(metrics):
    per_class = metrics['per_class']
    support = per_class['support']
    recall = per_class['recall']
    difficult = [
        {
            'class_index': idx,
            'support': int(support[idx]),
            'recall': float(recall[idx]),
        }
        for idx in range(len(support))
        if support[idx] > 0 and recall[idx] < 0.7
    ]
    return difficult


if __name__ == '__main__':
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else str(RAW_DATA_PATH)
    
    logger.info('Loading dataset from %s', path)
    df = pd.read_csv(path)
    if 'priority' not in df.columns:
        from preprocess import assign_priority_label
        df['priority'] = df['text'].astype(str).map(assign_priority_label)

    def _preprocess_row_for_eval(text: str):
        item = preprocess_text(text)
        return pd.Series(
            {
                'clean': item['text'],
                'lang': item['language'],
                'priority_hint': item['priority'],
            }
        )

    df[['clean', 'lang', 'priority_hint']] = df['text'].astype(str).apply(_preprocess_row_for_eval)
    df['priority'] = df['priority'].astype(str).where(df['priority'].notna(), df['priority_hint'])

    # Department evaluation
    logger.info('Evaluating department model...')
    dept_res = evaluate_model(OUTPUT_DIR / 'dept_model', df['clean'].values, df['label'].astype(str).values)
    logger.info('Department Model Results:')
    logger.info('  Accuracy: %.4f', dept_res['accuracy'])
    logger.info('  Macro Precision: %.4f', dept_res['macro_precision'])
    logger.info('  Macro Recall: %.4f', dept_res['macro_recall'])
    logger.info('  Macro F1: %.4f', dept_res['macro_f1'])
    logger.info('  Weighted F1: %.4f', dept_res['weighted_f1'])
    logger.info('  Avg Confidence: %.4f', dept_res['avg_confidence'])
    logger.info('  Low Confidence Rate: %.4f', dept_res['low_confidence_rate'])
    logger.info('  Classes: %s', dept_res['label_classes'])
    logger.info('  Difficult Categories: %s', build_difficulty_report(dept_res))

    # Priority evaluation
    logger.info('Evaluating priority model...')
    prio_res = evaluate_model(OUTPUT_DIR / 'priority_model', df['clean'].values, df['priority'].astype(str).values)
    logger.info('Priority Model Results:')
    logger.info('  Accuracy: %.4f', prio_res['accuracy'])
    logger.info('  Macro Precision: %.4f', prio_res['macro_precision'])
    logger.info('  Macro Recall: %.4f', prio_res['macro_recall'])
    logger.info('  Macro F1: %.4f', prio_res['macro_f1'])
    logger.info('  Weighted F1: %.4f', prio_res['weighted_f1'])
    logger.info('  Avg Confidence: %.4f', prio_res['avg_confidence'])
    logger.info('  Low Confidence Rate: %.4f', prio_res['low_confidence_rate'])
    logger.info('  Classes: %s', prio_res['label_classes'])
    logger.info('  Difficult Categories: %s', build_difficulty_report(prio_res))
