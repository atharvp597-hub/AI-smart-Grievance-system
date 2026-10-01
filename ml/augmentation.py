from __future__ import annotations

import random
import re
from typing import List, Tuple

# Conservative mappings to avoid unrealistic synthetic text. We only
# replace a few high-signal tokens (water, bijli, garbage, road, pothole, tank)
# with Devanagari and common romanized Hinglish variants.
WORD_MAP = {
    "water": ("पानी", "pani"),
    "no water": ("पानी नहीं है", "pani nahi"),
    "power": ("बिजली", "bijli"),
    "electricity": ("बिजली", "bijli"),
    "garbage": ("कचरा", "kuda"),
    "trash": ("कचरा", "kuda"),
    "road": ("सड़क", "road"),
    "pothole": ("खाई/गड्ढा", "pothole"),
    "streetlight": ("स्ट्रीट लाइट", "streetlight"),
    "drain": ("नाली", "drain"),
    "sewage": ("सीवेज", "sewage"),
    "leak": ("लीक", "leak"),
    "leakage": ("लीकेज", "leakage"),
    "tank": ("टैंक", "tank"),
    "tanker": ("टैंकर", "tanker"),
}

ROMAN_PUNCT_REMOVAL = re.compile(r"[^0-9A-Za-z\s']")


def _token_replace_keep_case(token: str, new: str) -> str:
    if token.istitle():
        return new.capitalize()
    if token.isupper():
        return new.upper()
    return new


def to_hinglish(sentence: str, replace_prob: float = 0.35) -> str:
    """Replace some high-signal English tokens with common romanized Hindi (Hinglish).

    This is conservative: only replaces tokens present in WORD_MAP with the
    romanized form (index 1).
    """
    tokens = sentence.split()
    out: List[str] = []
    for tok in tokens:
        key = tok.lower().strip(".,!?;:\"'()[]")
        if key in WORD_MAP and random.random() < replace_prob:
            new = WORD_MAP[key][1]
            out.append(_token_replace_keep_case(tok, new))
        else:
            out.append(tok)
    return " ".join(out)


def to_hindi_devanagari(sentence: str, replace_prob: float = 0.25) -> str:
    """Replace some high-signal tokens with Devanagari Hindi (conservative)."""
    tokens = sentence.split()
    out: List[str] = []
    for tok in tokens:
        key = tok.lower().strip(".,!?;:\"'()[]")
        if key in WORD_MAP and random.random() < replace_prob:
            new = WORD_MAP[key][0]
            out.append(_token_replace_keep_case(tok, new))
        else:
            out.append(tok)
    return " ".join(out)


def to_mixed(sentence: str, hinglish_prob: float = 0.25, devanagari_prob: float = 0.15) -> str:
    # Apply hinglish then devanagari replacements on disjoint random choices
    sentence = sentence
    # First pass: randomly replace with hinglish
    tokens = sentence.split()
    out: List[str] = []
    for tok in tokens:
        key = tok.lower().strip(".,!?;:\"'()[]")
        r = random.random()
        if key in WORD_MAP and r < devanagari_prob:
            out.append(_token_replace_keep_case(tok, WORD_MAP[key][0]))
        elif key in WORD_MAP and r < (devanagari_prob + hinglish_prob):
            out.append(_token_replace_keep_case(tok, WORD_MAP[key][1]))
        else:
            out.append(tok)
    return " ".join(out)


def introduce_typos(text: str, prob: float = 0.06) -> str:
    """Introduce simple, human-like typos: char drop, swap, duplicate."""
    if prob <= 0:
        return text

    chars = list(text)
    i = 0
    while i < len(chars):
        if random.random() < prob and chars[i].isalpha():
            r = random.random()
            if r < 0.33 and i + 1 < len(chars):  # swap
                chars[i], chars[i + 1] = chars[i + 1], chars[i]
                i += 2
                continue
            elif r < 0.66:  # delete
                chars.pop(i)
                continue
            else:  # duplicate
                chars.insert(i, chars[i])
                i += 2
                continue
        i += 1
    return "".join(chars)


def augment_rows(rows: List[Tuple[str, str]], *,
                 add_hinglish: int = 200,
                 add_hindi: int = 150,
                 add_mixed: int = 150,
                 add_noisy: int = 200) -> List[Tuple[str, str]]:
    """Given existing rows (text,label) return new rows appended with augmentations.

    The augmentation is conservative to keep text natural.
    """
    random.seed(42)
    augmented = list(rows)
    base_samples = [r for r in rows]
    if not base_samples:
        return augmented

    # Hinglish
    for _ in range(add_hinglish):
        text, label = random.choice(base_samples)
        new_text = to_hinglish(text, replace_prob=0.35)
        if new_text != text:
            augmented.append((introduce_typos(new_text, prob=0.03), label))

    # Hindi Devanagari
    for _ in range(add_hindi):
        text, label = random.choice(base_samples)
        new_text = to_hindi_devanagari(text, replace_prob=0.28)
        if new_text != text:
            augmented.append((new_text, label))

    # Mixed
    for _ in range(add_mixed):
        text, label = random.choice(base_samples)
        new_text = to_mixed(text, hinglish_prob=0.28, devanagari_prob=0.12)
        augmented.append((introduce_typos(new_text, prob=0.04), label))

    # Noisy variations
    for _ in range(add_noisy):
        text, label = random.choice(base_samples)
        noisy = introduce_typos(text, prob=0.08)
        # also sometimes strip punctuation and remove some vowels to simulate texting
        if random.random() < 0.25:
            noisy = ROMAN_PUNCT_REMOVAL.sub("", noisy)
            noisy = re.sub(r"[aeiou]{2,}", lambda m: m.group(0)[0], noisy, flags=re.IGNORECASE)
        augmented.append((noisy, label))

    random.shuffle(augmented)
    return augmented
