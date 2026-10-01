from collections import Counter
from difflib import SequenceMatcher

import pandas as pd

from preprocess import assign_priority_label, basic_clean, preprocess_text


def _is_noisy(text: str) -> bool:
    text = (text or "").strip()
    if len(text) < 10:
        return True

    alpha = sum(ch.isalpha() for ch in text)
    if alpha / max(1, len(text)) < 0.4:
        return True

    word_count = len(text.split())
    if word_count < 3:
        return True

    return False


def _find_near_duplicates(texts, threshold: float = 0.92):
    matches = []
    normalized = [basic_clean(text) for text in texts]

    for idx, current in enumerate(normalized):
        for other_idx in range(idx + 1, len(normalized)):
            ratio = SequenceMatcher(None, current, normalized[other_idx]).ratio()
            if ratio >= threshold:
                matches.append((idx, other_idx, round(ratio, 4)))

    return matches


def analyze_dataset(path):
    df = pd.read_csv(path)
    if 'priority' not in df.columns:
        df['priority'] = df['text'].astype(str).map(assign_priority_label)

    processed = df['text'].fillna('').astype(str).map(preprocess_text)
    df['clean'] = processed.map(lambda item: item['text'])
    df['language'] = processed.map(lambda item: item['language'])
    df['priority_proxy'] = processed.map(lambda item: item['priority'])

    exact_duplicates = int(df.duplicated(subset=['clean']).sum())
    label_counts = Counter(df['label'].dropna().astype(str))
    priority_counts = Counter(df['priority'].dropna().astype(str))
    noisy_mask = df['clean'].map(_is_noisy)
    noisy_samples = df[noisy_mask]
    weak_labels = [label for label, count in label_counts.items() if count < 20]
    weak_priority_labels = [label for label, count in priority_counts.items() if count < 20]
    near_duplicates = _find_near_duplicates(df['clean'].tolist())

    imbalance_ratio = 0.0
    if label_counts:
        label_values = list(label_counts.values())
        imbalance_ratio = max(label_values) / max(1, min(label_values))

    priority_mismatch = int((df['priority'].astype(str) != df['priority_proxy'].astype(str)).sum())

    report = {
        'num_rows': int(len(df)),
        'exact_duplicates': exact_duplicates,
        'near_duplicate_pairs': int(len(near_duplicates)),
        'label_counts': dict(label_counts),
        'priority_counts': dict(priority_counts),
        'class_imbalance_ratio': round(float(imbalance_ratio), 4),
        'num_noisy': int(len(noisy_samples)),
        'weak_labels': weak_labels,
        'weak_priority_labels': weak_priority_labels,
        'priority_label_mismatches': priority_mismatch,
        'languages': dict(Counter(df['language'].dropna().astype(str))),
    }

    if near_duplicates:
        example_indices = sorted({idx for pair in near_duplicates[:20] for idx in pair[:2]})
        sample_frame = df.iloc[example_indices]
    else:
        sample_frame = noisy_samples.sample(min(20, len(noisy_samples))) if len(noisy_samples) > 0 else noisy_samples

    return report, sample_frame


if __name__ == '__main__':
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else 'model_mine/dataset.csv'
    report, noisy = analyze_dataset(path)
    print('Dataset report:')
    for k, v in report.items():
        print(f"{k}: {v}")
    print('\nExample noisy rows:')
    print(noisy)
