#!/usr/bin/env python3
"""Serve the built website at a repository subpath for browser acceptance tests."""
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class Handler(SimpleHTTPRequestHandler):
    prefix = "/secprbench-results/"

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == self.prefix.rstrip("/"):
            self.send_response(302)
            self.send_header("Location", self.prefix)
            self.end_headers()
            return
        if not path.startswith(self.prefix):
            self.send_error(404)
            return
        self.path = self.path[len(self.prefix) - 1:]
        super().do_GET()

    def log_message(self, _format, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=Path("dist"))
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    root = args.directory.resolve()
    if not (root / "index.html").is_file():
        parser.error("Build the site before starting its preview.")
    with ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(root))) as server:
        print(f"http://127.0.0.1:{args.port}{Handler.prefix}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
