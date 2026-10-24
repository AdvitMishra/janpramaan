import base64
import ast
import json
import re
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from PIL import Image

import server
from screening import (
    RequestRateLimiter,
    CATEGORY_TOPICS,
    ScreeningError,
    ScreeningStore,
    _data_url_info,
    apply_obvious_scope_rules,
    classify_publication,
    screen_complaint,
    validate_complaint,
    validate_analysis_result,
    validate_screening_result,
)


def screening_result(**changes):
    result = {
        "civic_relevance": "relevant",
        "suspected_personal_dispute": False,
        "potential_spam": False,
        "missing_information": [],
        "evidence_status": "missing",
        "evidence_consistency": "not_assessed",
        "sensitive_content_detected": False,
        "explanation": "A public infrastructure concern was reported.",
        "recommended_action": "proceed_to_review",
    }
    return result | changes


def analysis_result(**changes):
    result = {
        "is_civic_issue": True,
        "category": "Roads and infrastructure",
        "issue_type": "Pothole",
        "civic_relevance": "relevant",
        "reason": "A pothole affects public road infrastructure.",
        "missing_information": [],
        "recommended_action": "continue",
        "priority": "Medium",
    }
    return result | changes


def complaint_payload(**changes):
    return {
        "title": "Pothole on public road",
        "description": "A large pothole affects traffic on a public road.",
        "category": "Roads and infrastructure",
        "topic": "Pothole",
        "locality": "Arera Colony",
    } | changes


class ScreeningValidationTests(unittest.TestCase):
    def test_analysis_schema_enforces_category_and_matching_issue_type(self):
        self.assertEqual(validate_analysis_result(analysis_result())["issue_type"], "Pothole")
        with self.assertRaises(ScreeningError):
            validate_analysis_result(analysis_result(issue_type="Hospital service"))
        with self.assertRaises(ScreeningError):
            validate_analysis_result(analysis_result(is_civic_issue="true"))
        with self.assertRaises(ScreeningError):
            validate_analysis_result(
                analysis_result(civic_relevance="out_of_scope", recommended_action="continue")
            )

    def test_backend_categories_and_topics_match_existing_report_form(self):
        frontend = (Path(server.ROOT) / "app.js").read_text(encoding="utf-8")
        categories_match = re.search(r"const categories = (\[.*?\]);", frontend, re.DOTALL)
        topics_match = re.search(r"const categoryTopics = (\{.*?\n  \});", frontend, re.DOTALL)
        self.assertIsNotNone(categories_match)
        self.assertIsNotNone(topics_match)
        form_categories = ast.literal_eval(categories_match.group(1))
        form_topics = ast.literal_eval(topics_match.group(1))
        self.assertEqual(form_categories, list(CATEGORY_TOPICS))
        self.assertEqual(
            {category: set(topics) for category, topics in form_topics.items()},
            CATEGORY_TOPICS,
        )

    def test_text_only_civic_report_is_valid(self):
        complaint, uploads = validate_complaint(complaint_payload())
        self.assertEqual(complaint["topic"], "Pothole")
        self.assertFalse(uploads["photo"]["provided"])
        self.assertFalse(uploads["beforeEvidence"]["provided"])

    def test_rejects_invalid_category_topic_pair(self):
        with self.assertRaisesRegex(ValueError, "within the selected category"):
            validate_complaint(complaint_payload(topic="Hospital service"))

    def test_rejects_image_with_mismatched_signature(self):
        fake_png = "data:image/png;base64," + base64.b64encode(b"not a png").decode()
        with self.assertRaisesRegex(ValueError, "does not match"):
            _data_url_info(fake_png, "Report photo")

    def test_accepts_decodable_png_and_rejects_too_large_image(self):
        with tempfile.TemporaryDirectory() as folder:
            image_path = Path(folder) / "small.png"
            Image.new("RGB", (2, 2), "white").save(image_path, format="PNG")
            encoded = base64.b64encode(image_path.read_bytes()).decode()
        result = _data_url_info(f"data:image/png;base64,{encoded}", "Report photo")
        self.assertTrue(result["provided"])
        self.assertEqual(result["content_type"], "image/png")
        with self.assertRaisesRegex(ValueError, "no larger than 3 MB"):
            _data_url_info("data:image/png;base64," + ("A" * (4_200_000)), "Report photo")

    def test_accepts_jpeg_png_and_webp_content(self):
        for image_format, mime_type in (
            ("JPEG", "image/jpeg"),
            ("PNG", "image/png"),
            ("WEBP", "image/webp"),
        ):
            with self.subTest(image_format=image_format):
                image_buffer = BytesIO()
                Image.new("RGB", (2, 2), "white").save(image_buffer, format=image_format)
                encoded = base64.b64encode(image_buffer.getvalue()).decode()
                result = _data_url_info(f"data:{mime_type};base64,{encoded}", "Report photo")
                self.assertTrue(result["provided"])
                self.assertEqual(result["content_type"], mime_type)

    def test_schema_rejects_wrong_types_and_extra_fields(self):
        with self.assertRaises(ScreeningError):
            validate_screening_result(screening_result(potential_spam="false"))
        with self.assertRaises(ScreeningError):
            validate_screening_result(screening_result(unexpected="value"))


class PublicationPolicyTests(unittest.TestCase):
    def test_public_civic_report_can_pass_configured_policy_without_photo(self):
        self.assertEqual(
            classify_publication(screening_result(), {"photo": {"provided": False}, "beforeEvidence": {"provided": False}}),
            ("approved_for_publication", False),
        )

    def test_unclear_report_requests_clarification(self):
        self.assertEqual(
            classify_publication(
                screening_result(civic_relevance="unclear", missing_information=["Approximate time"]),
                {"photo": {"provided": False}, "beforeEvidence": {"provided": False}},
            ),
            ("needs_clarification", True),
        )

    def test_out_of_scope_report_is_rejected(self):
        self.assertEqual(
            classify_publication(
                screening_result(civic_relevance="out_of_scope", recommended_action="reject_as_out_of_scope"),
                {"photo": {"provided": False}, "beforeEvidence": {"provided": False}},
            ),
            ("rejected_out_of_scope", False),
        )

    def test_private_neighbour_dispute_is_rejected_but_institutional_claim_is_not(self):
        private_report = apply_obvious_scope_rules(
            {
                "title": "Disagreement with my neighbour",
                "description": "My neighbour and I disagree about a private boundary.",
            },
            screening_result(
                civic_relevance="unclear",
                suspected_personal_dispute=True,
                recommended_action="hold_for_moderation",
            ),
        )
        self.assertEqual(private_report["civic_relevance"], "out_of_scope")
        self.assertEqual(private_report["recommended_action"], "reject_as_out_of_scope")

        hospital_report = apply_obvious_scope_rules(
            {
                "title": "Alleged hospital overcharging",
                "description": "A hospital visit included unexplained charges. This is an allegation about a healthcare service.",
            },
            screening_result(),
        )
        self.assertEqual(hospital_report["civic_relevance"], "relevant")

    def test_obvious_advertisement_is_kept_out_of_publication(self):
        assessment = apply_obvious_scope_rules(
            {
                "title": "Claim a free prize now",
                "description": "Click here to claim a free prize.",
            },
            screening_result(civic_relevance="unclear"),
        )
        self.assertEqual(assessment["civic_relevance"], "out_of_scope")
        self.assertEqual(assessment["recommended_action"], "reject_as_out_of_scope")
        self.assertEqual(
            classify_publication(
                assessment,
                {"photo": {"provided": False}, "beforeEvidence": {"provided": False}},
            ),
            ("rejected_out_of_scope", False),
        )

    def test_spam_sensitive_mismatch_and_media_require_review(self):
        no_media = {"photo": {"provided": False}, "beforeEvidence": {"provided": False}}
        for flags in (
            {"potential_spam": True},
            {"sensitive_content_detected": True},
            {"evidence_consistency": "inconsistent"},
        ):
            with self.subTest(flags=flags):
                self.assertEqual(
                    classify_publication(screening_result(**flags), no_media),
                    ("held_for_moderation", True),
                )
        image_upload = {"photo": {"provided": True}, "beforeEvidence": {"provided": False}}
        self.assertEqual(
            classify_publication(screening_result(), image_upload),
            ("held_for_moderation", True),
        )
        before_upload = {"photo": {"provided": False}, "beforeEvidence": {"provided": True}}
        self.assertEqual(
            classify_publication(screening_result(), before_upload),
            ("held_for_moderation", True),
        )

    def test_identical_repeat_is_held_without_calling_model(self):
        with tempfile.TemporaryDirectory() as folder:
            store = ScreeningStore(Path(folder) / "screening.sqlite3")
            complaint, uploads = validate_complaint(complaint_payload())
            complaint["before_evidence_present"] = True
            uploads["beforeEvidence"]["provided"] = True
            store.store_screening(complaint, screening_result(), "approved_for_publication", False, "test")
            with patch("screening.screen_with_ollama", side_effect=AssertionError("duplicate must not call model")):
                assessment, status, review = screen_complaint(complaint, uploads, store)
        self.assertEqual(status, "held_for_moderation")
        self.assertTrue(review)
        self.assertTrue(assessment["potential_spam"])
        self.assertEqual(assessment["evidence_status"], "provided")

    def test_correction_requires_receipt_and_is_stored_separately(self):
        with tempfile.TemporaryDirectory() as folder:
            store = ScreeningStore(Path(folder) / "screening.sqlite3")
            complaint, _ = validate_complaint(complaint_payload())
            complaint_id, receipt = store.store_screening(
                complaint, screening_result(), "needs_clarification", True, "test"
            )
            self.assertFalse(
                store.store_correction(
                    complaint_id, "wrong-receipt", "Here is more information.", screening_result(),
                    "pending_review", True, "test",
                )
            )
            self.assertTrue(
                store.store_correction(
                    complaint_id, receipt, "Here is more information.", screening_result(),
                    "pending_review", True, "test",
                )
            )
            with store._connect() as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM corrections").fetchone()[0], 1)
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM screenings").fetchone()[0], 2)

    def test_rate_limiter_enforces_window_limit(self):
        limiter = RequestRateLimiter(max_requests=2, window_seconds=60)
        self.assertTrue(limiter.allow("local"))
        self.assertTrue(limiter.allow("local"))
        self.assertFalse(limiter.allow("local"))


class ScreeningApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = ScreeningStore(Path(self.temp_dir.name) / "screening.sqlite3")
        self.store_patch = patch("server.SCREENING_STORE", self.store)
        self.rate_limiter_patch = patch(
            "server.SCREENING_RATE_LIMITER",
            RequestRateLimiter(max_requests=10, window_seconds=60),
        )
        self.store_patch.start()
        self.rate_limiter_patch.start()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.JanPramaanHandler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)
        self.rate_limiter_patch.stop()
        self.store_patch.stop()
        self.temp_dir.cleanup()

    def request(self, method, path, payload=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.httpd.server_address[1], timeout=5)
        body = None if payload is None else json.dumps(payload).encode()
        request_headers = dict(headers or {})
        if body is not None:
            request_headers.setdefault("Content-Type", "application/json")
        connection.request(method, path, body=body, headers=request_headers)
        response = connection.getresponse()
        result = response.status, response.read()
        connection.close()
        return result

    def test_invalid_complaint_is_rejected_before_model_call(self):
        with patch("server.screen_complaint") as screen:
            status, body = self.request(
                "POST",
                "/api/submit-complaint",
                complaint_payload(title="short"),
            )
        self.assertEqual(status, 400)
        self.assertIn(b"Title must be between", body)
        screen.assert_not_called()

    def test_ollama_failure_does_not_store_or_accept_submission(self):
        with patch(
            "server.screen_complaint",
            side_effect=ScreeningError("Local Ollama is unavailable.", 503),
        ):
            status, body = self.request(
                "POST",
                "/api/submit-complaint",
                complaint_payload(),
            )
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body), {"error": "Local Ollama is unavailable."})
        with self.store._connect() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM complaints").fetchone()[0], 0)

    def test_submission_and_receipt_protected_correction_route(self):
        with patch(
            "server.screen_complaint",
            return_value=(screening_result(), "needs_clarification", True),
        ):
            status, body = self.request(
                "POST",
                "/api/submit-complaint",
                complaint_payload(),
            )
        self.assertEqual(status, 201)
        response = json.loads(body)
        self.assertEqual(response["screening"]["status"], "needs_clarification")
        self.assertNotIn(b"Pothole on public road", body)

        with patch(
            "server.screen_complaint",
            return_value=(screening_result(), "pending_review", True),
        ):
            correction_status, correction_body = self.request(
                "POST",
                f"/api/complaints/{response['complaint_id']}/correction",
                {"correction": "The affected location is beside the public market entrance."},
                {"X-Report-Receipt": response["receipt_token"]},
            )
        self.assertEqual(correction_status, 200)
        self.assertEqual(
            json.loads(correction_body)["screening"]["status"],
            "pending_review",
        )
        with self.store._connect() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM corrections").fetchone()[0], 1)
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM screenings").fetchone()[0], 2)


if __name__ == "__main__":
    unittest.main()
