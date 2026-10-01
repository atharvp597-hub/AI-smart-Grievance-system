import os
from pathlib import Path

# Paths
ROOT = Path(__file__).parent
RAW_DATA_PATH = ROOT / 'model_mine' / 'dataset.csv'
OUTPUT_DIR = ROOT / 'models'

# Model choices: 'distilbert-base-multilingual-cased' or 'ai4bharat/indic-bert'
# Prefer a local Hugging Face snapshot when available so training can run offline.
LOCAL_MULTILINGUAL_SNAPSHOT = (
    Path.home()
    / '.cache'
    / 'huggingface'
    / 'hub'
    / 'models--distilbert-base-multilingual-cased'
    / 'snapshots'
    / '45c032ab32cc946ad88a166f7cb282f58c753c2e'
)
MODEL_NAME = os.getenv(
    'MODEL_NAME',
    str(LOCAL_MULTILINGUAL_SNAPSHOT if LOCAL_MULTILINGUAL_SNAPSHOT.exists() else 'distilbert-base-multilingual-cased'),
)

# Training hyperparameters (tweakable)
TRAIN_EPOCHS = 3
BATCH_SIZE = 16
LEARNING_RATE = 2e-5
WEIGHT_DECAY = 0.01
SEED = 42

# Other
MAX_LENGTH = 128
