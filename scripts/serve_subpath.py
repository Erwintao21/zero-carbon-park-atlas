from __future__ import annotations

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "site"
PREFIX = "/zero-carbon-park-atlas"


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        if path == PREFIX:
            path = PREFIX + "/"
        if path.startswith(PREFIX + "/"):
            path = path[len(PREFIX):]
        return str(ROOT / path.lstrip("/"))


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8766), Handler).serve_forever()
