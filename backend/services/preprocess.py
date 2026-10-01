from __future__ import annotations

import re
import sys
from pathlib import Path

from langdetect import detect

try:
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    from ml.preprocess import basic_clean as shared_basic_clean
    from ml.preprocess import detect_language as shared_detect_language
except Exception:
    shared_basic_clean = None
    shared_detect_language = None


MULTISPACE_PATTERN = re.compile(r"\s+")
DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")


def detect_language(text: str):
    if shared_detect_language:
        return shared_detect_language(text)

    try:
        if DEVANAGARI_PATTERN.search(text or ""):
            return "hi"
        return detect(text)
    except Exception:
        return "en"


def clean_text(text: str):
    if shared_basic_clean:
        return shared_basic_clean(text)
    return MULTISPACE_PATTERN.sub(" ", (text or "").lower().strip())


def preprocess_pipeline(text: str):
    cleaned_text = clean_text(text)
    language = detect_language(cleaned_text)
    return cleaned_text, language
