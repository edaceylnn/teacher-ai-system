import json
from typing import Any

from app.core.config import settings


class AIServiceUnavailableError(RuntimeError):
    """Raised when AI generation cannot run in the current environment."""


SYSTEM_INSTRUCTION_TR = (
    "Sen öğretmenler için güvenilir bir eğitim asistanısın. "
    "Varsayım uydurma; yalnızca verilen öğrenci verilerine dayan. "
    "Notlardaki 'category' alanı Sınav, Ders İçi Performans, Performans Ödevi "
    "veya Ödev türünü belirtir; değerlendirmeni bu türlere göre ayır (ör. sınavlarda "
    "güçlü ama ders içi performansta zayıf gibi net ayrımlar yap). "
    "Dil sıcak, profesyonel ve Türkçe olsun."
)


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

TOPIC_ANALYSIS_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "name": "topic_analysis_output",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "summary": {"type": "string"},
            "missing_topics": {"type": "array", "items": {"type": "string"}},
            "practice_plan": {"type": "array", "items": {"type": "string"}},
            "teacher_notes": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "summary", "missing_topics", "practice_plan", "teacher_notes"],
    },
}

LESSON_PLAN_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "name": "lesson_plan_output",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "objective": {"type": "string"},
            "warmup": {"type": "string"},
            "activities": {"type": "array", "items": {"type": "string"}},
            "assessment": {"type": "string"},
            "homework": {"type": "string"},
        },
        "required": ["title", "objective", "warmup", "activities", "assessment", "homework"],
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


def generate_topic_analysis(input_payload: dict[str, Any]) -> dict[str, Any]:
    return _generate_structured_output(
        input_payload=input_payload,
        output_schema=TOPIC_ANALYSIS_SCHEMA,
        task=(
            "Öğrencinin notları, devamsızlığı ve öğretmen gözlemlerinden yola çıkarak "
            "eksik konu/gelişim analizi üret. Veride olmayan konu adlarını kesin bilgi gibi sunma; "
            "çıkarımlarını ölçülü ifade et."
        ),
    )


def generate_lesson_plan(input_payload: dict[str, Any]) -> dict[str, Any]:
    return _generate_structured_output(
        input_payload=input_payload,
        output_schema=LESSON_PLAN_SCHEMA,
        task=(
            "Öğretmen için sınıf düzeyine ve son öğrenci verilerine uygun, uygulanabilir "
            "bir Türkçe ders planı üret."
        ),
    )


def _generate_structured_output(
    input_payload: dict[str, Any],
    output_schema: dict[str, Any],
    task: str,
) -> dict[str, Any]:
    if settings.ai_provider == "gemini":
        return _generate_via_gemini(input_payload, output_schema, task)
    return _generate_via_openai(input_payload, output_schema, task)


def _generate_via_openai(
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
                {"role": "system", "content": SYSTEM_INSTRUCTION_TR},
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


def _strip_additional_properties(node: Any) -> Any:
    """Gemini's response_schema is an OpenAPI 3.0 subset that doesn't
    recognize 'additionalProperties' — drop it recursively rather than
    maintaining a second copy of every schema above just for Gemini."""
    if isinstance(node, dict):
        return {key: _strip_additional_properties(value) for key, value in node.items() if key != "additionalProperties"}
    if isinstance(node, list):
        return [_strip_additional_properties(item) for item in node]
    return node


def _generate_via_gemini(
    input_payload: dict[str, Any],
    output_schema: dict[str, Any],
    task: str,
) -> dict[str, Any]:
    if not settings.gemini_api_key:
        raise AIServiceUnavailableError("GEMINI_API_KEY tanımlı değil.")

    try:
        from google import genai
        from google.genai import errors as genai_errors
        from google.genai import types
    except ImportError as exc:
        raise AIServiceUnavailableError("Google Gemini SDK kurulu değil.") from exc

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=f"{task}\n\nÖğrenci verisi:\n{json.dumps(input_payload, ensure_ascii=False)}",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION_TR,
                response_mime_type="application/json",
                response_schema=_strip_additional_properties(output_schema["schema"]),
            ),
        )
    except genai_errors.APIError as exc:
        status_code = getattr(exc, "code", None)
        if status_code == 429:
            raise AIServiceUnavailableError("Gemini API kota veya hız limitine takıldı.") from exc
        if status_code in (401, 403):
            raise AIServiceUnavailableError("Gemini API anahtarı geçersiz veya yetkisiz.") from exc
        raise AIServiceUnavailableError(f"Gemini API hata döndürdü: {status_code}.") from exc

    try:
        return json.loads(response.text)
    except (AttributeError, TypeError, json.JSONDecodeError) as exc:
        raise AIServiceUnavailableError("AI yanıtı beklenen JSON formatında değil.") from exc
