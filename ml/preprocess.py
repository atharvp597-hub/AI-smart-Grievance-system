from __future__ import annotations

import re
import unicodedata
from typing import Dict, List, Tuple

from langdetect import detect


ZERO_WIDTH_PATTERN = re.compile(r"[\u200b\u200c\u200d\ufeff]")
WHITESPACE_PATTERN = re.compile(r"\s+")
REPEATED_CHAR_PATTERN = re.compile(r"(.)\1{2,}")
DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")
LATIN_PATTERN = re.compile(r"[A-Za-z]")

HINGLISH_NORMALIZATION_MAP = {
    "wtr": "water",
    "watr": "water",
    "pani": "water",
    "bijli": "electricity",
    "grbg": "garbage",
    "kuda": "garbage",
    "kachra": "garbage",
    "rd": "road",
    "riad": "road",
    "pothol": "pothole",
    "ofc": "office",
    "complnt": "complaint",
    "tym": "time",
    "presure": "pressure",
    "jaldi": "soon",
    "abhi": "now",
    "nhi": "not",
    "nahi": "not",
    "kr": "do",
    "kar": "do",
    "bhut": "very",
    "bohot": "very",
    "bhot": "very",
    "andhera": "darkness",
    "band": "closed",
    "gya": "gone",
    "gyi": "gone",
    "gayi": "gone",
}

# Additional common romanized Hindi tokens to detect Hinglish
COMMON_ROMAN_HINDI_TOKENS = {
    "pani",
    "paani",
    "paani",
    "nahi",
    "nhi",
    "kal",
    "aaj",
    "subah",
    "raat",
    "din",
    "se",
    "ab",
    "pichle",
    "pichle",
    "gaya",
    "gayi",
    "hai",
    "haiy",
    "kya",
    "kr",
    "kar",
    "please",
}

HIGH_PRIORITY_SIGNALS = {
    "emergency": 4,
    "danger": 4,
    "fire": 4,
    "accident": 4,
    "contamination": 4,
    "sewage overflow": 4,
    "burst pipe": 4,
    "power outage": 3,
    "water outage": 3,
    "no water": 3,
    "no electricity": 3,
    "blackout": 3,
    "flooded road": 3,
    "road collapse": 4,
    "unsafe": 2,
    "hazard": 3,
    "poison": 4,
}

MEDIUM_PRIORITY_SIGNALS = {
    "low pressure": 2,
    "intermittent": 2,
    "repeated": 1,
    "not working": 2,
    "blocked": 2,
    "broken": 2,
    "delay": 1,
    "unreliable": 2,
    "stopped": 2,
    "overflow": 2,
    "smell": 1,
    "dirty": 1,
    "inconvenience": 1,
}

IMPACT_PATTERNS = [
    re.compile(r"\b(whole|entire|all|multiple|several)\s+(street|lane|block|colony|area|homes|families|houses)\b"),
    re.compile(r"\b(since|for)\s+(yesterday|days|weeks|hours|morning|night)\b"),
    re.compile(r"\b(no|not|without)\s+(water|power|electricity|supply|drinking water)\b"),
    re.compile(r"\b(blocked|collapsed|overflowing|leaking|tripping|cut)\b"),
]


def normalize_whitespace(text: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", text).strip()


def remove_control_chars(text: str) -> str:
    text = ZERO_WIDTH_PATTERN.sub("", text)
    return "".join(ch for ch in text if unicodedata.category(ch)[0] != "C")


def reduce_repeated_chars(text: str) -> str:
    return REPEATED_CHAR_PATTERN.sub(r"\1\1", text)


def normalize_hinglish_tokens(text: str) -> str:
    tokens = text.split()
    normalized_tokens: List[str] = []

    for token in tokens:
        stripped = token.strip(".,!?;:\"'()[]{}")
        lowered = stripped.lower()
        replacement = HINGLISH_NORMALIZATION_MAP.get(lowered)
        if replacement:
            normalized_tokens.append(replacement)
            continue

        if "2day" in lowered:
            normalized_tokens.append(lowered.replace("2day", "today"))
            continue

        normalized_tokens.append(token)

    return " ".join(normalized_tokens)


def detect_language(text: str) -> str:
    if not text:
        return "unknown"

    has_devanagari = bool(DEVANAGARI_PATTERN.search(text))
    has_latin = bool(LATIN_PATTERN.search(text))
    if has_devanagari and has_latin:
        return "mixed"
    if has_devanagari:
        return "hi"

    # Heuristic: if many tokens match romanized Hindi words, mark as 'hi-roman'
    try:
        tokens = [t.strip(".,!?;:\"'()[]") for t in text.lower().split() if t]
        if tokens:
            hit = sum(1 for t in tokens if t in COMMON_ROMAN_HINDI_TOKENS or t in HINGLISH_NORMALIZATION_MAP)
            if hit >= max(1, len(tokens) // 6):
                return "hi-roman"
    except Exception:
        pass

    try:
        detected = detect(text)
    except Exception:
        return "en"

    if detected in {"hi", "en"}:
        return detected

    return "en"


def basic_clean(text: str) -> str:
    if not isinstance(text, str):
        return ""

    text = text.replace("\n", " ").replace("\r", " ")
    text = unicodedata.normalize("NFKC", text)
    text = remove_control_chars(text)
    # normalize short Hinglish tokens and common romanized forms
    text = normalize_hinglish_tokens(text)
    text = reduce_repeated_chars(text)
    text = normalize_whitespace(text)
    return text


def extract_priority_signals(text: str) -> Dict[str, object]:
    normalized = basic_clean(text)
    lower_text = normalized.lower()
    score = 0
    reasons: List[str] = []

    for phrase, weight in HIGH_PRIORITY_SIGNALS.items():
        if phrase in lower_text:
            score += weight
            reasons.append(phrase)

    for phrase, weight in MEDIUM_PRIORITY_SIGNALS.items():
        if phrase in lower_text:
            score += weight
            reasons.append(phrase)

    for pattern in IMPACT_PATTERNS:
        if pattern.search(lower_text):
            score += 2
            reasons.append(pattern.pattern)

    if re.search(r"\b\d+\s*(day|days|week|weeks|hour|hours|minute|minutes)\b", lower_text):
        score += 2
        reasons.append("duration")

    if re.search(r"\b(since\s+yesterday|since\s+last\s+night|for\s+several\s+days|for\s+days|for\s+hours)\b", lower_text):
        score += 2
        reasons.append("sustained_issue")

    if re.search(r"\b(all\s+day|all\s+night|whole\s+day)\b", lower_text):
        score += 2
        reasons.append("all_day_issue")

    return {
        "score": score,
        "reasons": sorted(set(reasons)),
        "clean_text": normalized,
    }


def assign_priority_label(text: str) -> str:
    signals = extract_priority_signals(text)
    score = int(signals["score"])

    if score >= 6:
        return "HIGH"
    if score >= 3:
        return "MEDIUM"
    return "LOW"


def preprocess_text(text: str) -> Dict[str, str]:
    cleaned = basic_clean(text)
    language = detect_language(cleaned)
    priority = assign_priority_label(cleaned)
    return {
        "text": cleaned,
        "language": language,
        "priority": priority,
    }


def preprocess_row(text: str) -> Tuple[str, str, str]:
    preprocessed = preprocess_text(text)
    return preprocessed["text"], preprocessed["language"], preprocessed["priority"]
