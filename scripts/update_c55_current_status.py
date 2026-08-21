from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HISTORY_PATH = ROOT / "data" / "c55p_status_history.csv"
PROFILE_PATH = ROOT / "data" / "park_profiles.csv"
VERIFIED_LEVELS = {"E3_OFFICIAL_SECONDARY", "E4_OFFICIAL_PRIMARY"}
PRIORITY = {
    "UNKNOWN": 0,
    "PLANNED": 1,
    "PILOT": 2,
    "SELECTED_FOR_CONSTRUCTION": 3,
    "DESIGNATED": 4,
}
EXTRA_FIELDS = (
    "Recognition_Name",
    "Evidence_Level",
    "Evidence_Quality",
    "Submission_ID",
    "Reviewed_Status",
    "Supersedes_Evidence_ID",
    "Corrects_Record_ID",
    "Last_Verified_Date",
)


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def default_evidence_level(row: dict[str, str]) -> str:
    publisher = row.get("Publisher", "")
    if "公开转载" in publisher:
        return "E3_OFFICIAL_SECONDARY"
    if any(name in publisher for name in ("国家发展和改革委员会", "工业和信息化部")):
        return "E4_OFFICIAL_PRIMARY"
    return "E2_INSTITUTIONAL"


def status_key(row: dict[str, str]) -> tuple[int, int]:
    return PRIORITY.get(row.get("Recognition_Status", "UNKNOWN"), 0), int(row.get("Year") or 0)


def main() -> None:
    history_fields, history = read_csv(HISTORY_PATH)
    original_count = len(history)
    for field in EXTRA_FIELDS:
        if field not in history_fields:
            history_fields.append(field)
    for row in history:
        row["Recognition_Name"] = row.get("Recognition_Name") or row.get("Source_Title", "")
        row["Evidence_Level"] = row.get("Evidence_Level") or default_evidence_level(row)
        row["Evidence_Quality"] = row.get("Evidence_Quality") or ("HIGH" if row["Evidence_Level"] in VERIFIED_LEVELS else "LOW")
        row["Reviewed_Status"] = row.get("Reviewed_Status") or "ACCEPTED"
        row["Last_Verified_Date"] = row.get("Last_Verified_Date") or "2026-08-22"
        for field in ("Submission_ID", "Supersedes_Evidence_ID", "Corrects_Record_ID"):
            row[field] = row.get(field, "")
    if len(history) != original_count:
        raise RuntimeError("History enrichment must never delete or replace rows")
    write_csv(HISTORY_PATH, history_fields, history)

    profile_fields, profiles = read_csv(PROFILE_PATH)
    by_park: dict[str, list[dict[str, str]]] = {}
    for row in history:
        by_park.setdefault(row["Park_ID"], []).append(row)
    for profile in profiles:
        rows = by_park.get(profile["Park_ID"], [])
        verified = [
            row for row in rows
            if row.get("Reviewed_Status") == "ACCEPTED" and row.get("Evidence_Level") in VERIFIED_LEVELS
        ]
        if not verified:
            continue
        current = max(verified, key=status_key)
        profile["C55P_Status"] = current["Recognition_Status"]
        profile["C55P_Level"] = current["Recognition_Level"]
        profile["C55P_Year"] = current["Year"]
        profile["C55P_Source_Title"] = current["Source_Title"]
        profile["C55P_Publisher"] = current["Publisher"]
        profile["C55P_URL"] = current["URL"]
        profile["C55P_Evidence_ID"] = current["Evidence_ID"]
        profile["C55P_History_Count"] = str(len(rows))
    write_csv(PROFILE_PATH, profile_fields, profiles)
    print(f"updated {len(history)} history rows and {len(profiles)} park profiles")


if __name__ == "__main__":
    main()
