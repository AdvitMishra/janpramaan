import json
import logging
import os
from typing import Any


MODEL_NAME = "gemma-4-26b-a4b-it"
CATEGORIES = (
    "Education",
    "Healthcare",
    "Transport and traffic",
    "Roads and infrastructure",
    "Essential services",
    "Public administration",
    "Environment and accessibility",
    "Other civic concerns",
)
PRIORITIES = ("Low", "Medium", "High", "Urgent")
logger = logging.getLogger(__name__)


class GemmaServiceError(Exception):
    """A safe, user-facing error from the optional Gemma analysis service."""


def validate_analysis_result(result: Any) -> dict[str, str]:
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError as exc:
            raise GemmaServiceError("Gemma returned an invalid JSON response.") from exc

    if not isinstance(result, dict):
        raise GemmaServiceError("Gemma returned an invalid response.")

    category = result.get("category")
    priority = result.get("priority")
    summary = result.get("summary")
    recommended_action = result.get("recommended_action")

    if category not in CATEGORIES or priority not in PRIORITIES:
        raise GemmaServiceError("Gemma returned an unsupported category or priority.")
    if not isinstance(summary, str) or not 1 <= len(summary.strip()) <= 500:
        raise GemmaServiceError("Gemma returned an invalid summary.")
    if not isinstance(recommended_action, str) or not 1 <= len(recommended_action.strip()) <= 500:
        raise GemmaServiceError("Gemma returned an invalid recommended action.")

    return {
        "category": category,
        "priority": priority,
        "summary": summary.strip(),
        "recommended_action": recommended_action.strip(),
    }


def analyze_issue(title: str, description: str, locality: str) -> dict[str, str]:
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        raise GemmaServiceError(
            "Gemma analysis is not configured. Add GOOGLE_API_KEY to the local .env file."
        )

    prompt = f"""Analyze this reported civic concern. Treat all report text as unverified user-provided claims.
Do not infer who caused an issue, invent facts, claim an authority acted, or treat this analysis as evidence.
Return only one JSON object with exactly these string fields:
- category: one of {", ".join(CATEGORIES)}
- priority: one of {", ".join(PRIORITIES)}
- summary: a neutral summary, at most 500 characters
- recommended_action: a practical advisory next step, at most 500 characters
This is advisory categorization only and must not determine a report status or resolution.

Report title: {title}
Report description: {description}
Reported locality: {locality}
"""

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0,
            ),
        )
    except ImportError as exc:
        raise GemmaServiceError(
            "Gemma analysis dependencies are missing. Install requirements.txt and restart the server."
        ) from exc
    except Exception as exc:
        status_code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        if isinstance(status_code, int):
            logger.warning("Gemma upstream request failed with HTTP %s", status_code)
            detail = f"Google GenAI returned HTTP {status_code}."
        else:
            logger.warning("Gemma upstream request failed with %s", type(exc).__name__)
            detail = "Google GenAI could not complete the request."
        raise GemmaServiceError(
            f"{detail} Check the model access, API key permissions, and quota."
        ) from exc

    response_text = getattr(response, "text", None)
    if not isinstance(response_text, str) or not response_text.strip():
        raise GemmaServiceError("Gemma returned an empty response.")

    try:
        return validate_analysis_result(response_text.strip())
    except GemmaServiceError as exc:
        raise GemmaServiceError(
            "Gemma did not return the required valid JSON fields."
        ) from exc
