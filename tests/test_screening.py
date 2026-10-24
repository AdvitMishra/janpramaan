import base64
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from screening import (
    RequestRateLimiter,
    ScreeningError,
    ScreeningStore,
    _data_url_info,
    classify_publication,
    screen_complaint,
    validate_complaint,
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


def complaint_payload(**changes):
    return {
        "title": "Pothole on public road",
        "description": "A large pothole affects traffic on a public road.",
        "category": "Roads and infrastructure",
        "topic": "Pothole",
        "locality": "Arera Colony",
    } | changes


class ScreeningValidationTests(unittest.TestCase):
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

    def test_identical_repeat_is_held_without_calling_model(self):
        with tempfile.TemporaryDirectory() as folder:
            store = ScreeningStore(Path(folder) / "screening.sqlite3")
            complaint, uploads = validate_complaint(complaint_payload())
            store.store_screening(complaint, screening_result(), "approved_for_publication", False, "test")
            with patch("screening.screen_with_ollama", side_effect=AssertionError("duplicate must not call model")):
                assessment, status, review = screen_complaint(complaint, uploads, store)
        self.assertEqual(status, "held_for_moderation")
        self.assertTrue(review)
        self.assertTrue(assessment["potential_spam"])

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


if __name__ == "__main__":
    unittest.main()
