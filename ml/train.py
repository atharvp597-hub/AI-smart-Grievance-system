import logging
import random
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import torch.nn.functional as F
from sklearn.utils.class_weight import compute_class_weight
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

import torch
from torch.utils.data import DataLoader, Dataset as TorchDataset
from torch.optim import AdamW
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    get_linear_schedule_with_warmup,
)
import joblib

from config import *
from ai_core import ComplaintDataset, build_model_metrics, save_training_metadata, split_frame
from preprocess import assign_priority_label, preprocess_text


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

RUN_ID = datetime.now().strftime('%Y%m%d_%H%M%S')


def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def train_epoch(model, dataloader, optimizer, scheduler, device, class_weights=None):
    model.train()
    total_loss = 0
    for batch in dataloader:
        optimizer.zero_grad()
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)

        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        loss = F.cross_entropy(outputs.logits, labels, weight=class_weights)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        scheduler.step()
        total_loss += loss.item()

    return total_loss / len(dataloader)


def evaluate(model, dataloader, device):
    model.eval()
    all_preds = []
    all_labels = []
    all_confidences = []
    total_loss = 0

    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            loss = F.cross_entropy(outputs.logits, labels)
            total_loss += loss.item()

            probabilities = torch.softmax(outputs.logits, dim=1)
            preds = torch.argmax(probabilities, dim=1)
            confidences = probabilities.max(dim=1).values
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_confidences.extend(confidences.cpu().numpy())

    metrics = build_model_metrics(all_labels, all_preds)
    metrics['loss'] = total_loss / max(1, len(dataloader))
    metrics['avg_confidence'] = float(np.mean(all_confidences)) if all_confidences else 0.0
    metrics['low_confidence_rate'] = float(np.mean(np.asarray(all_confidences) < 0.55)) if all_confidences else 0.0
    return metrics


def train_classification_model(df, label_col, output_subdir, model_name=MODEL_NAME):
    device = torch.device('cpu')
    logger.info('Using device: %s', device)

    # Prepare labels
    labels = df[label_col].astype(str)
    le = LabelEncoder()
    label_ids = le.fit_transform(labels)
    text_values = np.asarray(df['clean'].astype(str).tolist(), dtype=object)
    label_ids = np.asarray(label_ids, dtype=np.int64)

    class_labels = np.unique(label_ids)
    class_weight_values = compute_class_weight(class_weight='balanced', classes=class_labels, y=label_ids)
    class_weights = torch.tensor(class_weight_values, dtype=torch.float32, device=device)

    train_df, val_df, test_df = split_frame(df[["clean", label_col]].copy(), label_col=label_col)
    train_texts = np.asarray(train_df['clean'].astype(str).tolist(), dtype=object)
    val_texts = np.asarray(val_df['clean'].astype(str).tolist(), dtype=object)
    test_texts = np.asarray(test_df['clean'].astype(str).tolist(), dtype=object)
    train_labels = le.transform(train_df[label_col].astype(str))
    val_labels = le.transform(val_df[label_col].astype(str))
    test_labels = le.transform(test_df[label_col].astype(str))

    # Load tokenizer and model
    logger.info('Loading model: %s', model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(le.classes_),
        trust_remote_code=True
    ).to(device)

    # Create datasets
    train_dataset = ComplaintDataset(train_texts, train_labels, tokenizer, MAX_LENGTH)
    val_dataset = ComplaintDataset(val_texts, val_labels, tokenizer, MAX_LENGTH)

    # Dataloaders
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)

    # Optimizer and scheduler
    optimizer = AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    total_steps = len(train_loader) * TRAIN_EPOCHS
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=0,
        num_training_steps=total_steps
    )

    # Training loop
    best_f1 = -1.0
    output_path = OUTPUT_DIR / 'runs' / RUN_ID / output_subdir
    output_path.mkdir(parents=True, exist_ok=True)
    joblib.dump(le, output_path / 'label_encoder.joblib')

    logger.info('Starting training for %s', label_col)
    for epoch in range(TRAIN_EPOCHS):
        train_loss = train_epoch(model, train_loader, optimizer, scheduler, device, class_weights=class_weights)
        val_metrics = evaluate(model, val_loader, device)

        logger.info(
            'Epoch %d/%d - Train Loss: %.4f | Val Loss: %.4f | Val Acc: %.4f | Val Macro F1: %.4f | Low Conf: %.2f',
            epoch + 1, TRAIN_EPOCHS, train_loss, val_metrics['loss'], val_metrics['accuracy'], val_metrics['macro_f1'], val_metrics['low_confidence_rate']
        )

        if val_metrics['macro_f1'] > best_f1:
            best_f1 = val_metrics['macro_f1']
            logger.info('Saving best model (F1: %.4f)', best_f1)
            model.save_pretrained(str(output_path), safe_serialization=False)
            tokenizer.save_pretrained(str(output_path))

    test_dataset = ComplaintDataset(test_texts, test_labels, tokenizer, MAX_LENGTH)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE)
    test_metrics = evaluate(model, test_loader, device)

    save_training_metadata(
        output_path,
        {
            'label_column': label_col,
            'num_classes': int(len(le.classes_)),
            'classes': list(le.classes_),
            'best_val_macro_f1': float(best_f1),
            'test_metrics': test_metrics,
            'class_weights': [float(value) for value in class_weight_values.tolist()],
            'train_size': int(len(train_df)),
            'validation_size': int(len(val_df)),
            'test_size': int(len(test_df)),
        },
    )

    logger.info('Training finished. Best Val Macro F1: %.4f', best_f1)
    logger.info('Test Macro F1: %.4f | Test Acc: %.4f', test_metrics['macro_f1'], test_metrics['accuracy'])
    return output_path, test_metrics


def main():
    set_seed(SEED)

    logger.info('Loading dataset from %s', RAW_DATA_PATH)
    df = pd.read_csv(RAW_DATA_PATH)
    if 'priority' not in df.columns:
        df['priority'] = df['text'].astype(str).map(assign_priority_label)

    # Preprocess and annotate
    logger.info('Preprocessing %d texts', len(df))
    def _preprocess_row_for_training(text: str):
        item = preprocess_text(text)
        return pd.Series(
            {
                'clean': item['text'],
                'lang': item['language'],
                'priority_hint': item['priority'],
            }
        )

    df[['clean', 'lang', 'priority_hint']] = df['text'].astype(str).apply(_preprocess_row_for_training)
    df['priority'] = df['priority'].fillna(df['priority_hint']).astype(str)
    df = df.drop_duplicates(subset=['clean', 'label']).reset_index(drop=True)

    # Train department model
    logger.info('=' * 60)
    logger.info('TRAINING DEPARTMENT CLASSIFIER')
    logger.info('=' * 60)
    dept_out, dept_test = train_classification_model(df, label_col='label', output_subdir='dept_model')

    # Train priority model
    logger.info('=' * 60)
    logger.info('TRAINING PRIORITY CLASSIFIER')
    logger.info('=' * 60)
    prio_out, prio_test = train_classification_model(df, label_col='priority', output_subdir='priority_model')

    logger.info('=' * 60)
    logger.info('TRAINING COMPLETE')
    logger.info('Models saved to: %s', OUTPUT_DIR / 'runs' / RUN_ID)
    logger.info('Department model: %s', dept_out)
    logger.info('Priority model: %s', prio_out)
    logger.info('Department test F1: %.4f', dept_test['macro_f1'])
    logger.info('Priority test F1: %.4f', prio_test['macro_f1'])
    logger.info('=' * 60)


if __name__ == '__main__':
    main()
