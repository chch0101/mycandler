import os
import re
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 로컬 모델 디렉토리 (config.json + tokenizer 위치)
MODEL_LOCAL_PATH = Path(__file__).parent.parent.parent / "models" / "gemma-4-e2b-it"
# HuggingFace Hub 모델 ID
HF_MODEL_ID = "google/gemma-4-e2b-it"

_pipeline = None
_model_available = False


def _has_local_weights(model_dir: Path) -> bool:
    """로컬 디렉토리에 실제 가중치 파일이 있는지 확인."""
    return (
        any(model_dir.glob("*.safetensors"))
        or any(model_dir.glob("model*.bin"))
        or any(model_dir.glob("pytorch_model*.bin"))
    )


def _load_model():
    global _pipeline, _model_available
    if _pipeline is not None:
        return _pipeline

    try:
        import torch
        from transformers import pipeline, AutoTokenizer

        model_dir = MODEL_LOCAL_PATH.resolve()

        if _has_local_weights(model_dir):
            # 가중치가 로컬에 있으면 바로 로드
            model_id = str(model_dir)
            logger.info(f"로컬 가중치에서 Gemma 로드: {model_id}")
        else:
            # 가중치가 없으면 로컬 디렉토리를 cache_dir 삼아
            # HF Hub에서 가중치 다운로드 (config/tokenizer는 재사용)
            logger.info(
                f"로컬에 가중치 없음 → HuggingFace Hub에서 다운로드: {HF_MODEL_ID}\n"
                f"저장 위치: {model_dir}"
            )
            model_id = HF_MODEL_ID

        device = (
            "cuda" if torch.cuda.is_available()
            else "mps" if torch.backends.mps.is_available()
            else "cpu"
        )
        logger.info(f"디바이스: {device}")

        pipe_kwargs: dict = {
            "trust_remote_code": True,
            "model_kwargs": {"torch_dtype": torch.bfloat16},
        }
        if device != "cpu":
            pipe_kwargs["device_map"] = "auto"
        # HF Hub에서 받을 때 로컬 폴더에 저장
        if model_id == HF_MODEL_ID:
            pipe_kwargs["model_kwargs"]["cache_dir"] = str(model_dir.parent)

        _pipeline = pipeline("text-generation", model=model_id, **pipe_kwargs)
        _model_available = True
        logger.info("Gemma 모델 로드 완료")
        return _pipeline

    except Exception as e:
        logger.error(f"Gemma 모델 로드 실패: {e}")
        _model_available = False
        return None


def is_academic_paper(text: str) -> bool:
    text_lower = text.lower()
    paper_signals = [
        r'\babstract\b',
        r'\bkeywords?\b',
        r'\breferences\b',
        r'\bdoi\s*:',
        r'\barxiv\b',
        r'\bintroduction\b.{0,200}\brelated work\b',
        r'\bconclusion\b',
        r'\bproposed method\b',
        r'\bexperiments?\b.{0,200}\bresults?\b',
        r'\bet al\.',
        r'\bieee\b|\bacm\b|\bneurips\b|\bicml\b|\biclr\b|\bcvpr\b|\beccv\b',
        r'\bfig\.\s*\d+',
        r'\btable\s*\d+',
    ]
    score = sum(1 for p in paper_signals if re.search(p, text_lower))
    return score >= 3


def build_prompt(text: str, is_paper: bool, filename: str = "") -> str:
    text_excerpt = text[:6000] if len(text) > 6000 else text

    if is_paper:
        return f"""<start_of_turn>user
다음은 학술 논문입니다. 아래 항목을 포함한 **기술적 요약**을 한국어로 작성해주세요:

1. **연구 목적** - 이 논문이 해결하려는 문제
2. **핵심 기술/방법론** - 제안하는 방법, 알고리즘, 아키텍처
3. **주요 기여** - 기존 연구 대비 개선점 또는 새로운 기여
4. **실험 결과** - 주요 성능 지표 또는 평가 결과
5. **결론 및 한계** - 연구의 결론과 향후 과제

논문:
{text_excerpt}
<end_of_turn>
<start_of_turn>model
"""
    else:
        return f"""<start_of_turn>user
다음 문서를 간결하게 요약해주세요. 핵심 내용, 주요 포인트, 중요한 정보를 포함해서 한국어로 작성해주세요.

파일명: {filename}

내용:
{text_excerpt}
<end_of_turn>
<start_of_turn>model
"""


def generate_summary(text: str, is_paper: bool, filename: str = "") -> str:
    if not text.strip():
        return "내용을 추출할 수 없습니다."

    pipe = _load_model()
    if pipe is None:
        return _fallback_summary(text, is_paper)

    try:
        prompt = build_prompt(text, is_paper, filename)
        result = pipe(
            prompt,
            max_new_tokens=800,
            do_sample=False,
            temperature=1.0,
            repetition_penalty=1.1,
        )
        generated = result[0]["generated_text"]
        # Extract only the model's response after the prompt
        if "<start_of_turn>model\n" in generated:
            summary = generated.split("<start_of_turn>model\n")[-1]
            summary = summary.replace("<end_of_turn>", "").strip()
        else:
            summary = generated[len(prompt):].strip()
        return summary if summary else "요약 생성에 실패했습니다."

    except Exception as e:
        logger.error(f"Gemma inference error: {e}")
        return _fallback_summary(text, is_paper)


def _fallback_summary(text: str, is_paper: bool) -> str:
    """Simple extractive summary when model is unavailable."""
    sentences = re.split(r'[.!?]\s+', text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

    if is_paper:
        important = []
        keywords = ["propose", "method", "result", "achieve", "show", "outperform", "improve", "novel"]
        for s in sentences[:50]:
            if any(k in s.lower() for k in keywords):
                important.append(s)
            if len(important) >= 5:
                break
        if not important:
            important = sentences[:5]
        return "[Gemma 가중치 다운로드 필요 - 임시 추출 요약]\n\n" + " ".join(important[:5]) + "..."
    else:
        return "[Gemma 가중치 다운로드 필요 - 임시 추출 요약]\n\n" + " ".join(sentences[:4]) + "..."
