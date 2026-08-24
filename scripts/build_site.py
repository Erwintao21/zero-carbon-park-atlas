from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
SITE = ROOT / "site"
DATA = ROOT / "data"


def main() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    shutil.copytree(WEB, SITE)
    site_data = SITE / "data"
    site_data.mkdir(parents=True, exist_ok=True)
    if DATA.exists():
        for src in DATA.iterdir():
            if src.is_file():
                shutil.copy2(src, site_data / src.name)
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    print(f"built v3.1 site from {WEB} with {len(list(site_data.glob('*')))} data files")


if __name__ == "__main__":
    main()
