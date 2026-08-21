from __future__ import annotations

import csv
import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def rows(name: str) -> list[dict[str, str]]:
    with (DATA / name).open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


class C55PContributionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.history = rows("c55p_status_history.csv")
        cls.profiles = rows("park_profiles.csv")
        spec = importlib.util.spec_from_file_location(
            "update_c55", ROOT / "scripts" / "update_c55_current_status.py"
        )
        assert spec and spec.loader
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def test_submission_log_schema_excludes_contact(self) -> None:
        with (DATA / "c55p_submission_log.csv").open("r", encoding="utf-8-sig", newline="") as handle:
            fields = next(csv.reader(handle))
        self.assertEqual(len(fields), len(set(fields)))
        self.assertIn("Review_Status", fields)
        self.assertNotIn("Contributor_Contact", fields)

    def test_history_is_enriched_and_preserved(self) -> None:
        self.assertEqual(len(self.history), 77)
        required = {
            "Recognition_Name", "Evidence_Level", "Evidence_Quality", "Submission_ID",
            "Reviewed_Status", "Supersedes_Evidence_ID", "Corrects_Record_ID", "Last_Verified_Date",
        }
        self.assertTrue(required.issubset(self.history[0]))
        self.assertTrue(all(row["Reviewed_Status"] == "ACCEPTED" for row in self.history))
        nat51 = [row for row in self.history if row["Park_ID"] == "NAT-051"]
        self.assertEqual({row["Recognition_Status"] for row in nat51}, {"DESIGNATED", "SELECTED_FOR_CONSTRUCTION"})

    def test_current_status_priority_and_year(self) -> None:
        sample = [
            {"Recognition_Status": "SELECTED_FOR_CONSTRUCTION", "Year": "2026"},
            {"Recognition_Status": "DESIGNATED", "Year": "2024"},
            {"Recognition_Status": "DESIGNATED", "Year": "2025"},
        ]
        current = max(sample, key=self.module.status_key)
        self.assertEqual(current["Recognition_Status"], "DESIGNATED")
        self.assertEqual(current["Year"], "2025")

    def test_profiles_match_verified_history(self) -> None:
        profile_map = {row["Park_ID"]: row for row in self.profiles}
        for park_id in profile_map:
            verified = [
                row for row in self.history
                if row["Park_ID"] == park_id
                and row["Reviewed_Status"] == "ACCEPTED"
                and row["Evidence_Level"] in self.module.VERIFIED_LEVELS
            ]
            current = max(verified, key=self.module.status_key)
            self.assertEqual(profile_map[park_id]["C55P_Status"], current["Recognition_Status"])

    def test_frontend_has_no_write_token_or_api(self) -> None:
        source = (ROOT / "web" / "contribution.js").read_text(encoding="utf-8")
        self.assertNotIn("api.github.com", source)
        self.assertNotIn("Authorization", source)
        self.assertNotRegex(source, r"gh[pousr]_[A-Za-z0-9]{20,}")
        self.assertIn("issues/new", source)
        self.assertIn("textContent", source)

    def test_issue_template_requires_review_labels(self) -> None:
        template = (ROOT / ".github" / "ISSUE_TEMPLATE" / "c55p-status-submission.yml").read_text(encoding="utf-8")
        for label in ("data-submission", "c55p", "needs-review"):
            self.assertIn(label, template)
        self.assertIn("PENDING", template)


if __name__ == "__main__":
    unittest.main()
