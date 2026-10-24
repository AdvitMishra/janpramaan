import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from gemma_service import MODEL_NAME, GemmaServiceError, analyze_issue


ROOT = Path(__file__).resolve().parent
MAX_REQUEST_BYTES = 16_384
STATIC_FILES = {"", "index.html", "app.js", "styles.css"}

def load_local_settings():
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return

    supported_settings = {"GOOGLE_API_KEY", "JANPRAMAAN_HOST", "JANPRAMAAN_PORT"}
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
                    "model": MODEL_NAME,
                    "api_key_configured": bool(os.getenv("GOOGLE_API_KEY", "").strip()),
                },
            )
            return
        if route.startswith("/api/"):
            self._send_json(404, {"error": "API route not found."})
            return
        super().do_GET()

    def do_POST(self):
        route = urlsplit(self.path).path
        if route != "/api/analyze-issue":
            self._send_json(404, {"error": "API route not found."})
            return
        if self.headers.get_content_type() != "application/json":
            self._send_json(415, {"error": "Content-Type must be application/json."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self._send_json(400, {"error": "A valid Content-Length header is required."})
            return
        if content_length < 1 or content_length > MAX_REQUEST_BYTES:
            self._send_json(413, {"error": "Request body must be between 1 and 16384 bytes."})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": "Request body must contain valid JSON."})
            return

        try:
            issue = validate_issue_payload(payload)
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
            return

        try:
            result = analyze_issue(**issue)
        except GemmaServiceError as exc:
            status = 503 if "not configured" in str(exc) or "dependencies are missing" in str(exc) else 502
            self._send_json(status, {"error": str(exc)})
            return

        self._send_json(200, {"analysis": result, "advisory_only": True})

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
    print(f"Gemma model configured: {bool(os.getenv('GOOGLE_API_KEY', '').strip())}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down JanPramaan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
