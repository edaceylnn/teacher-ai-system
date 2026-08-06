import json
from typing import Any

from app.core.config import settings


class AIServiceUnavailableError(RuntimeError):
    """Raised when AI generation cannot run in the current environment."""


REPORT_COMMENT_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "name": "report_comment_output",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "comment": {"type": "string"},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "growth_areas": {"type": "array", "items": {"type": "string"}},
            "teacher_actions": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "comment", "strengths", "growth_areas", "teacher_actions"],
    },
}

PARENT_MESSAGE_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "name": "parent_message_output",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "subject": {"type": "string"},
            "message": {"type": "string"},
            "tone": {"type": "string"},
            "next_steps": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["subject", "message", "tone", "next_steps"],
    },
}

WEEKLY_SUMMARY_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "name": "weekly_teacher_summary_output",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "summary": {"type": "string"},
            "attention_points": {"type": "array", "items": {"type": "string"}},
            "positive_signals": {"type": "array", "items": {"type": "string"}},
            "suggested_actions": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "summary", "attention_points", "positive_signals", "suggested_actions"],
    },
}


def generate_report_comment(input_payload: dict[str, Any]) -> dict[str, Any]:
    return _generate_structured_output(
        input_payload=input_payload,
        output_schema=REPORT_COMMENT_SCHEMA,
        task=(
            "Öğrencinin gerçek not, devamsızlık ve öğretmen gözlem verilerine "
            "dayalı, yapıcı ve kişisel bir Türkçe karne yorumu üret."
        ),
    )


def generate_parent_message(input_payload: dict[str, Any]) -> dict[str, Any]:
    return _generate_structured_output(
        input_payload=input_payload,
        output_schema=PARENT_MESSAGE_SCHEMA,
        task=(
            "Velinin kolay anlayacağı, kısa, yapıcı ve çözüm odaklı bir Türkçe "
            "veli bilgilendirme mesajı üret."
        ),
    )


def generate_weekly_summary(input_payload: dict[str, Any]) -> dict[str, Any]:
    return _generate_structured_output(
        input_payload=input_payload,
        output_schema=WEEKLY_SUMMARY_SCHEMA,
        task=(
            "Öğretmen için haftalık kısa bir Türkçe sınıf özeti üret. "
            "Dikkat edilmesi gereken öğrencileri, olumlu sinyalleri ve net aksiyonları belirt."
        ),
    )


def _generate_structured_output(
    input_payload: dict[str, Any],
    output_schema: dict[str, Any],
    task: str,
) -> dict[str, Any]:
    if not settings.openai_api_key:
        raise AIServiceUnavailableError("OPENAI_API_KEY tanımlı değil.")

    try:
        from openai import APIConnectionError, APIStatusError, AuthenticationError, OpenAI, RateLimitError
    except ImportError as exc:
        raise AIServiceUnavailableError("OpenAI Python SDK kurulu değil.") from exc

    client = OpenAI(api_key=settings.openai_api_key)
    try:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "Sen öğretmenler için güvenilir bir eğitim asistanısın. "
                        "Varsayım uydurma; yalnızca verilen öğrenci verilerine dayan. "
                        "Dil sıcak, profesyonel ve Türkçe olsun."
                    ),
                },
                {
                    "role": "user",
                    "content": f"{task}\n\nÖğrenci verisi:\n{json.dumps(input_payload, ensure_ascii=False)}",
                },
            ],
            text={"format": output_schema},
        )
    except AuthenticationError as exc:
        raise AIServiceUnavailableError("OpenAI API anahtarı geçersiz veya yetkisiz.") from exc
    except RateLimitError as exc:
        error_code = getattr(getattr(exc, "body", None), "get", lambda _: None)("code")
        if error_code == "credit_balance_exhausted":
            raise AIServiceUnavailableError("OpenAI hesabında kullanılabilir API kredisi kalmamış.") from exc
        raise AIServiceUnavailableError("OpenAI API kota veya hız limitine takıldı.") from exc
    except APIConnectionError as exc:
        raise AIServiceUnavailableError("OpenAI API bağlantısı kurulamadı.") from exc
    except APIStatusError as exc:
        raise AIServiceUnavailableError(f"OpenAI API hata döndürdü: {exc.status_code}.") from exc

    try:
        return json.loads(response.output_text)
    except (AttributeError, json.JSONDecodeError) as exc:
        raise AIServiceUnavailableError("AI yanıtı beklenen JSON formatında değil.") from exc
