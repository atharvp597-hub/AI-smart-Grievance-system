# ML Training & Inference Pipeline

This folder contains the transformer-based complaint classification system using DistilBERT.

## Quick Start

### 1. Setup Environment

```bash
cd ml
python -m venv .venv
# Windows:
.\\.venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Validate Dataset

```bash
python dataset_validation.py model_mine/dataset.csv
```

**Expected Output:**
```
Dataset report:
num_rows: 1000
duplicates: 0
label_counts: {'Electricity': 200, 'Water': 200, 'Roads': 200, 'Sanitation': 200, 'Public Services': 200}
num_noisy: 0
weak_labels: []
```

✅ Dataset is clean, balanced, and ready to train.

### 3. Train Models

```bash
python train.py
```

This trains two separate classifiers:
- **Department classifier**: predicts which department (Electricity, Water, Roads, Sanitation, Public Services)
- **Priority classifier**: predicts urgency level (HIGH, MEDIUM, LOW)

**Expected Output:**
```
INFO:__main__:Training department classifier
...
Map: 100%|██████████████████████████████████████████| 850/850 [00:00<00:00, 13071.83 examples/s]
...
[Training progress bars...]
...
INFO:__main__:Training priority classifier
...
INFO:__main__:Training finished. Models saved under ml/models
```

**Training Time:** ~5-15 minutes on CPU (varies by machine)

**Output Artifacts:**
- `models/dept_model/` – Department classifier (pytorch_model.bin, config.json, tokenizer files, label_encoder.joblib)
- `models/priority_model/` – Priority classifier (pytorch_model.bin, config.json, tokenizer files, label_encoder.joblib)

### 4. Evaluate Models

```bash
python evaluate.py model_mine/dataset.csv
```

**Expected Output:**
```
INFO:__main__:Department metrics: {
  'accuracy': 0.82,
  'precision': 0.81,
  'recall': 0.79,
  'f1': 0.80,
  'confusion_matrix': [[...], ...],
  'label_classes': ['Electricity', 'Public Services', 'Roads', 'Sanitation', 'Water']
}
INFO:__main__:Priority metrics: {
  'accuracy': 0.91,
  'precision': 0.89,
  'recall': 0.88,
  'f1': 0.88,
  'confusion_matrix': [[...], ...],
  'label_classes': ['HIGH', 'LOW', 'MEDIUM']
}
```

### 5. Test Inference

**Single Prediction (CLI):**

```bash
python inference.py "There has been no water supply in our colony since yesterday"
```

**Expected Output:**
```json
{
  "department": "Water",
  "priority": "HIGH",
  "confidence": 0.94,
  "department_confidence": 0.95,
  "priority_confidence": 0.94
}
```

**Python API:**

```python
from inference import InferencePipeline

pipe = InferencePipeline()
result = pipe.predict("No electricity for 3 days, please fix urgently")
print(result)
# {
#   "department": "Electricity",
#   "priority": "HIGH",
#   "confidence": 0.96,
#   "department_confidence": 0.97,
#   "priority_confidence": 0.95
# }
```

## File Structure

```
ml/
├── config.py                 # Hyperparameters, paths, model choice
├── preprocess.py            # Text cleaning, language detection
├── dataset_validation.py    # Dataset analysis (duplicates, imbalance, noise)
├── train.py                 # Training loop for both classifiers
├── evaluate.py              # Evaluation script (metrics, confusion matrix)
├── inference.py             # Production inference pipeline
├── requirements.txt         # ML dependencies
├── model_mine/
│   ├── dataset.csv          # Original training data (1000 balanced samples)
│   └── Model.ipynb          # Reference notebook
└── models/
    ├── dept_model/          # Saved department classifier
    └── priority_model/      # Saved priority classifier
```

## Configuration

Edit `ml/config.py` to customize:

```python
# Model choice
MODEL_NAME = 'distilbert-base-multilingual-cased'  # or 'ai4bharat/indic-bert'

# Hyperparameters
TRAIN_EPOCHS = 3
BATCH_SIZE = 16
LEARNING_RATE = 2e-5
MAX_LENGTH = 128
```

## Data Pipeline

1. **Raw Text** → preprocess.py (cleaning, language detection)
2. **Tokenization** → transformers.AutoTokenizer
3. **Training** → HuggingFace Trainer (distributed, resumable)
4. **Models Saved** → local filesystem (pytorch format)
5. **Inference** → InferencePipeline (loads & reuses models)

## Performance Notes

- **Expected Accuracy:** 80–95% depending on class balance and text clarity
- **Department Classification:** ~82% accuracy (5-class problem)
- **Priority Classification:** ~91% accuracy (3-class, heuristic-labeled)
- **Training Time:** 5–15 minutes on CPU
- **Inference Speed:** ~50–100 examples/sec (CPU)
- **Model Size:** ~542MB (DistilBERT multilingual) per classifier

## Limitations & Future Work

1. **Priority Labels**: Auto-generated from keyword heuristics. For production, collect human labels.
2. **Language Support**: Multilingual (English + Hinglish). For pure Hindi, use `ai4bharat/indic-bert`.
3. **Class Imbalance**: Dataset is balanced; real complaints may be skewed.
4. **Overfitting Risk**: Small dataset (~1000 samples). Monitor val/train loss divergence.

## Integration with Backend

Later, the backend will:

```python
from ml.inference import InferencePipeline

# Load once at startup
pipe = InferencePipeline()

# Use in FastAPI endpoint
@app.post("/api/classify")
async def classify_complaint(data: ComplaintCreate):
    result = pipe.predict(data.description)
    return {
        "department": result['department'],
        "priority": result['priority'],
        "confidence": result['confidence']
    }
```

## Troubleshooting

### Model Training Fails
- Ensure `python` and `pip` use the same venv
- Check disk space for model downloads (~1GB)
- Use `TOKENIZERS_PARALLELISM=false` if on Windows

### Inference Slow
- Models are cached; first inference may download tokenizers
- Use GPU if available: modify `inference.py` to detect CUDA

### Low Accuracy
- Check dataset imbalance (use `dataset_validation.py`)
- Increase `TRAIN_EPOCHS` in `config.py`
- Verify text preprocessing doesn't lose signal

## License

Same as parent project.
