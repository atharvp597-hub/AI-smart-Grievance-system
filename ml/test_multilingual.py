from __future__ import annotations

import json

from inference import InferencePipeline


TEST_CASES = [
    ("No water supply since yesterday", "English"),
    ("2 din se pani nahi aa raha", "Hinglish"),
    ("कल से पानी नहीं आ रहा है", "Hindi"),
    ("streetlight kharab hai", "Hinglish"),
    ("bijli kal raat se gayi hui hai", "Hinglish"),
    ("road pe bahut bada pothole hai", "Hinglish"),
    ("garbage pickup nahi hua", "Hinglish"),
    ("No electricity in the evening", "English"),
    ("bijli nahi aa rhi", "Hinglish"),
]


def run_tests():
    pipe = InferencePipeline()
    results = []
    for text, kind in TEST_CASES:
        r = pipe.predict(text)
        results.append({"text": text, "kind": kind, "result": r})

    # Print detailed results
    print(json.dumps(results, indent=2, ensure_ascii=False))

    # Simple comparison summary: per-kind average confidence and low confidence rate
    summary = {}
    for item in results:
        kind = item["kind"]
        conf = float(item["result"]["confidence"])
        low = bool(item["result"]["is_low_confidence"])
        summary.setdefault(kind, {"count": 0, "sum_conf": 0.0, "low_count": 0})
        summary[kind]["count"] += 1
        summary[kind]["sum_conf"] += conf
        summary[kind]["low_count"] += 1 if low else 0

    for k, v in summary.items():
        avg = v["sum_conf"] / max(1, v["count"])
        print(f"{k}: examples={v['count']} avg_conf={avg:.3f} low_conf_rate={v['low_count']}/{v['count']}")


if __name__ == "__main__":
    run_tests()
