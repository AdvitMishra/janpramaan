import json
import os
import re
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
MAX_REQUEST_BYTES = 16_384
MAX_SCREENING_REQUEST_BYTES = 12 * 1024 * 1024
STATIC_FILES = {"", "index.html", "app.js", "styles.css"}

def load_local_settings():
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return

    supported_settings = {"OLLAMA_MODEL", "JANPRAMAAN_HOST", "JANPRAMAAN_PORT"}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or key not in supported_settings or key in os.environ:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ[key] = value


load_local_settings()

from screening import (
    OLLAMA_MODEL,
    RequestRateLimiter,
    ScreeningError,
    ScreeningStore,
    analyze_civic_issue,
    clean_correction,
    ollama_model_available,
    public_screening_summary,
    screen_complaint,
    validate_complaint,
)

SCREENING_STORE = ScreeningStore(ROOT / "data" / "screening.sqlite3")
SCREENING_RATE_LIMITER = RequestRateLimiter()


def validate_issue_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")

    limits = {"title": 120, "description": 2_000, "locality": 120}
    validated = {}
    for field, max_length in limits.items():
        value = payload.get(field)
        if not isinstance(value, str):
            raise ValueError(f"{field.capitalize()} must be a string.")
        value = value.strip()
        min_length = 8 if field == "title" else 20 if field == "description" else 2
        if not min_length <= len(value) <= max_length:
            raise ValueError(
                f"{field.capitalize()} must be between {min_length} and {max_length} characters."
            )
        validated[field] = value

    return validated


class JanPramaanHandler(SimpleHTTPRequestHandler):
    server_version = "JanPramaanAPI/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        return

    def translate_path(self, path):
        relative = unquote(urlsplit(path).path).lstrip("/")
        if not relative:
            relative = "index.html"
        candidate = (ROOT / relative).resolve()
        assets_root = (ROOT / "assets").resolve()
        is_asset = candidate.parent == assets_root
        is_public_file = relative in STATIC_FILES
        if not (is_public_file or is_asset) or not candidate.is_relative_to(ROOT):
            return str(ROOT / "__not_public__")
        return str(candidate)

    def do_GET(self):
        route = urlsplit(self.path).path
        if route in {"/health", "/api/health"}:
            self._send_json(
                200,
                {
                    "status": "ok",
                    "service": "JanPramaan API",
                    "model": OLLAMA_MODEL,
                    "screening_model": OLLAMA_MODEL,
                    "screening_endpoint": "/api/submit-complaint",
                    "ollama_available": ollama_model_available(),
                },
            )
            return
        if route.startswith("/api/"):
            self._send_json(404, {"error": "API route not found."})
            return
        super().do_GET()

    def do_POST(self):
        route = urlsplit(self.path).path
        if route == "/api/submit-complaint":
            self._handle_complaint_submission()
            return
        correction_match = re.fullmatch(r"/api/complaints/(JPS-[A-F0-9]{12})/correction", route)
        if correction_match:
            self._handle_correction(correction_match.group(1))
            return
        if route == "/api/analyze-issue":
            self._handle_issue_analysis()
            return
        self._send_json(404, {"error": "API route not found."})

    def _handle_issue_analysis(self):
        if not self._allow_screening_request():
            return
        payload = self._read_json_body(MAX_REQUEST_BYTES)
        if payload is None:
            return
        try:
            issue = validate_issue_payload(payload)
            result = analyze_civic_issue(issue)
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
            return
        except ScreeningError as exc:
            self._send_json(exc.status_code, {"error": str(exc)})
            return
        self._send_json(200, {"analysis": result, "advisory_only": True})

    def _read_json_body(self, max_bytes: int):
        if self.headers.get_content_type() != "application/json":
            self._send_json(415, {"error": "Content-Type must be application/json."})
            return None
        try:
            content_length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self._send_json(400, {"error": "A valid Content-Length header is required."})
            return None
        if content_length < 1 or content_length > max_bytes:
            self._send_json(413, {"error": "Request body is empty or exceeds the permitted size."})
            return None
        try:
            return json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": "Request body must contain valid JSON."})
            return None

    def _allow_screening_request(self) -> bool:
        client_ip = self.client_address[0]
        if SCREENING_RATE_LIMITER.allow(client_ip):
            return True
        self._send_json(429, {"error": "Too many screening requests. Please try again later."})
        return False

    def _handle_complaint_submission(self):
        if not self._allow_screening_request():
            return
        payload = self._read_json_body(MAX_SCREENING_REQUEST_BYTES)
        if payload is None:
            return
        try:
            complaint, uploads = validate_complaint(payload)
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
            return
        except ScreeningError as exc:
            self._send_json(exc.status_code, {"error": str(exc)})
            return
        try:
            assessment, status, human_review_required = screen_complaint(
                complaint, uploads, SCREENING_STORE
            )
            complaint_id, receipt_token = SCREENING_STORE.store_screening(
                complaint,
                assessment,
                status,
                human_review_required,
                OLLAMA_MODEL,
            )
        except ScreeningError as exc:
            self._send_json(exc.status_code, {"error": str(exc)})
            return
        except sqlite3.Error:
            self._send_json(503, {"error": "The local screening record could not be saved. No report was accepted."})
            return

        self._send_json(
            201,
            {
                "complaint_id": complaint_id,
                "receipt_token": receipt_token,
                "screening": public_screening_summary(assessment, status, human_review_required),
            },
        )

    def _handle_correction(self, complaint_id: str):
        if not self._allow_screening_request():
            return
        receipt_token = self.headers.get("X-Report-Receipt", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{40,60}", receipt_token):
            self._send_json(401, {"error": "A valid private report receipt is required."})
            return
        payload = self._read_json_body(8_192)
        if payload is None:
            return
        if not isinstance(payload, dict) or set(payload) != {"correction"}:
            self._send_json(400, {"error": "Submit a correction using the correction field."})
            return
        try:
            correction = clean_correction(payload["correction"])
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
            return
        complaint = SCREENING_STORE.get_complaint(complaint_id)
        if complaint is None or not SCREENING_STORE.has_valid_receipt(complaint_id, receipt_token):
            self._send_json(404, {"error": "The report or its private receipt could not be found."})
            return
        try:
            assessment, status, human_review_required = screen_complaint(
                complaint | {"description": f"{complaint['description']}\n\nReporter correction: {correction}"},
                {
                    "photo": {"provided": complaint["photo_present"]},
                    "beforeEvidence": {"provided": complaint["before_evidence_present"]},
                },
                SCREENING_STORE,
            )
            if not SCREENING_STORE.store_correction(
                complaint_id,
                receipt_token,
                correction,
                assessment,
                status,
                human_review_required,
                OLLAMA_MODEL,
            ):
                self._send_json(401, {"error": "A valid private report receipt is required."})
                return
        except ScreeningError as exc:
            self._send_json(exc.status_code, {"error": str(exc)})
            return
        except sqlite3.Error:
            self._send_json(503, {"error": "The correction could not be saved. Please try again later."})
            return

        self._send_json(
            200,
            {"screening": public_screening_summary(assessment, status, human_review_required)},
        )

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    host = os.getenv("JANPRAMAAN_HOST", "127.0.0.1")
    port = int(os.getenv("JANPRAMAAN_PORT", "8765"))
    server = ThreadingHTTPServer((host, port), JanPramaanHandler)
    print(f"JanPramaan running at http://{host}:{port}")
    print(f"Local Gemma screening model: {OLLAMA_MODEL}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down JanPramaan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
