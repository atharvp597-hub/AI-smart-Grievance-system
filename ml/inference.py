import json

from ai_core import GrievanceInferenceAdapter, get_default_adapter


class InferencePipeline:
    def __init__(self, dept_model_dir=None, prio_model_dir=None, low_confidence_threshold: float = 0.55):
        if dept_model_dir is None and prio_model_dir is None:
            self.adapter = get_default_adapter()
        else:
            self.adapter = GrievanceInferenceAdapter(
                dept_model_dir=dept_model_dir,
                priority_model_dir=prio_model_dir,
                low_confidence_threshold=low_confidence_threshold,
            )

    def predict(self, text: str):
        return self.adapter.predict(text)


def predict_from_cli():
    import sys
    text = ' '.join(sys.argv[1:])
    if not text:
        print('Usage: python inference.py "complaint text here"')
        return

    pipe = InferencePipeline()
    res = pipe.predict(text)
    print(json.dumps(res, indent=2))


if __name__ == '__main__':
    predict_from_cli()
