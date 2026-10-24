import json
import os
import threading
import unittest
from http.client import HTTPConnection
from unittest.mock import patch

from server import JanPramaanHandler
from http.server import ThreadingHTTPServer
from gemma_service import GemmaServiceError, validate_analysis_result


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), JanPramaanHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.httpd.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=2)

    def request(self, method, path, body=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request_headers = headers or {}
        if payload is not None:
            request_headers.setdefault("Content-Type", "application/json")
        connection.request(method, path, body=payload, headers=request_headers)
        response = connection.getresponse()
        result = response.status, response.read()
        connection.close()
        return result

    def test_health_endpoint_does_not_disclose_key(self):
        status, body = self.request("GET", "/api/health")
        payload = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["model"], "gemma-4-26b-a4b-it")
        self.assertNotIn("GOOGLE_API_KEY", payload)

    def test_invalid_issue_request_is_rejected_before_model_call(self):
        status, body = self.request(
            "POST",
            "/api/analyze-issue",
            {"title": "short", "description": "too short", "locality": "Bhopal"},
        )
        self.assertEqual(status, 400)
        self.assertIn("Title must be between", json.loads(body)["error"])

    def test_valid_issue_request_reports_missing_model_configuration(self):
        with patch.dict(os.environ, {"GOOGLE_API_KEY": ""}):
            status, body = self.request(
                "POST",
                "/api/analyze-issue",
                {
                    "title": "Damaged footpath needs attention",
                    "description": "A broken footpath section is difficult to use safely.",
                    "locality": "Arera Colony",
                },
            )
        self.assertEqual(status, 503)
        self.assertIn("not configured", json.loads(body)["error"])

    def test_root_serves_existing_frontend(self):
        status, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b"JanPramaan", body)

    def test_unknown_files_and_environment_file_are_not_served(self):
        status, _ = self.request("GET", "/.env")
        self.assertEqual(status, 404)
        status, _ = self.request("GET", "/server.py")
        self.assertEqual(status, 404)

    def test_model_output_schema_is_validated(self):
        result = validate_analysis_result(
            {
                "category": "Roads and infrastructure",
                "priority": "High",
                "summary": "A reported road defect.",
                "recommended_action": "Request a site inspection.",
            }
        )
        self.assertEqual(result["priority"], "High")
        with self.assertRaises(GemmaServiceError):
            validate_analysis_result({"category": "Unknown", "priority": "High"})


if __name__ == "__main__":
    unittest.main()
