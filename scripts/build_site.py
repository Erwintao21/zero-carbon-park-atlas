from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
DATA_FILES = (
    "park_catalog.csv", "park_profiles.csv", "park_transparency.csv",
    "park_indicator_availability.csv", "c55p_status_history.csv", "c55p_submission_log.csv",
    "park_public_evidence.csv",
)


def main() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    shutil.copytree(ROOT / "web", SITE)
    (SITE / "data").mkdir()
    for name in DATA_FILES:
        shutil.copy2(ROOT / "data" / name, SITE / "data" / name)
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    print(f"built {SITE} with {len(DATA_FILES)} data files")


if __name__ == "__main__":
    main()
