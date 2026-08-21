from __future__ import annotations

import csv
import unittest
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]


def rows(name: str) -> list[dict[str, str]]:
    with (ROOT / "data" / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


class AtlasDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = [r for r in rows("park_catalog.csv") if r["region_scope"] == "国内园区"]
        cls.profiles = rows("park_profiles.csv")
        cls.transparency = rows("park_transparency.csv")
        cls.availability = rows("park_indicator_availability.csv")
        cls.history = rows("c55p_status_history.csv")
        cls.evidence = rows("park_public_evidence.csv")

    def test_67_unique_park_ids_match_catalog(self) -> None:
        ids = [r["Park_ID"] for r in self.profiles]
        self.assertEqual(67, len(ids)); self.assertEqual(67, len(set(ids)))
        self.assertEqual({r["park_id"] for r in self.catalog}, set(ids))

    def test_2814_unique_park_indicator_pairs(self) -> None:
        pairs = {(r["Park_ID"], r["Indicator_ID"]) for r in self.availability}
        self.assertEqual(2814, len(self.availability)); self.assertEqual(2814, len(pairs))
        self.assertTrue(all(v == 42 for v in Counter(r["Park_ID"] for r in self.availability).values()))

    def test_c55_counts_and_history(self) -> None:
        self.assertEqual({"DESIGNATED":10,"SELECTED_FOR_CONSTRUCTION":57}, dict(Counter(r["C55P_Status"] for r in self.profiles)))
        self.assertEqual(77, len(self.history))

    def test_missing_is_blank_not_zero(self) -> None:
        unavailable = {"PARK_SURVEY_REQUIRED","ENTERPRISE_REQUIRED","MONITORING_REQUIRED","DEFINITION_PENDING","MISSING"}
        for row in self.availability:
            if row["Availability_Status"] in unavailable:
                self.assertEqual("", row["Current_Value"])

    def test_no_score_rank_or_benchmark_fields(self) -> None:
        forbidden = {"Green_Score","Overall_Score","Rank","Benchmark","Score"}
        for dataset in (self.profiles,self.transparency,self.availability,self.history):
            self.assertFalse(forbidden.intersection(dataset[0]))

    def test_transparency_boundary(self) -> None:
        self.assertTrue(all("不代表园区绿色低碳建设水平" in r["Interpretation"] for r in self.transparency))

    def test_evidence_ids_resolve_and_links_are_https(self) -> None:
        ids = {r["evidence_id"] for r in self.evidence}
        for row in self.availability:
            if row["Evidence_ID"]:
                self.assertIn(row["Evidence_ID"], ids)
        urls = [r["C55P_URL"] for r in self.profiles] + [r["URL"] for r in self.history if r["URL"]]
        self.assertTrue(urls)
        for url in urls:
            parsed=urlparse(url); self.assertEqual("https",parsed.scheme); self.assertTrue(parsed.netloc)

    def test_forbidden_claims_absent_from_site(self) -> None:
        text="\n".join((ROOT/"web"/name).read_text(encoding="utf-8") for name in ("index.html","app.js"))
        self.assertNotIn("已建成",text); self.assertNotIn("已达标",text)
        self.assertNotIn("Green Score",text); self.assertNotIn("Overall Score",text)


if __name__ == "__main__": unittest.main()
