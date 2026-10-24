#!/usr/bin/env python3
"""Check the independently deployable Pages output and its local data links."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


def check(root: Path) -> dict:
    errors: list[str] = []
    root = root.resolve()

    def local_file(relative: str) -> Path | None:
        candidate = root / relative
        if not candidate.resolve().is_relative_to(root):
            errors.append(f"Path leaves the website: {relative}")
            return None
        if not candidate.is_file() or candidate.is_symlink():
            errors.append(f"Missing regular website file: {relative}")
            return None
        return candidate

    local_file("index.html")
    local_file("paper.pdf")
    benchmark_file = local_file("data/benchmark.json")
    timeline_file = local_file("data/trajectory-index.json")
    cases = []
    timeline_count = 0
    if benchmark_file:
        data = json.loads(benchmark_file.read_text())
        cases = data["cases"]
        if len(cases) != 265 or len(data["models"]) != 10:
            errors.append("Website does not contain the final 265-case, 10-configuration release")
        for case in cases:
            local_file(case["detailPath"])
    if timeline_file:
        index = json.loads(timeline_file.read_text())
        for models in index["cases"].values():
            for variants in models.values():
                for item in variants.values():
                    if isinstance(item, dict) and item.get("viewPath"):
                        local_file(item["viewPath"])
                        timeline_count += 1
    total = 0
    largest = (0, "")
    files = 0
    for path in root.rglob("*"):
        if path.is_symlink():
            errors.append(f"Website contains a symbolic link: {path.relative_to(root)}")
        elif path.is_file():
            files += 1
            size = path.stat().st_size
            total += size
            largest = max(largest, (size, str(path.relative_to(root))))
            if size >= 100 * 1024**2:
                errors.append(f"File exceeds GitHub's 100 MiB Git limit: {path.relative_to(root)}")
            if any(part in {"archive", "node_modules", ".git"} for part in path.relative_to(root).parts):
                errors.append(f"Non-website directory was packaged: {path.relative_to(root)}")
    # Leave useful headroom below GitHub Pages' 1 GB publication limit.
    if total > 900_000_000:
        errors.append(f"Website exceeds the 900 MB deployment budget: {total:,} bytes")
    return {"ok": not errors, "root": str(root), "cases": len(cases),
            "timeline_links": timeline_count, "files": files, "bytes": total,
            "largest_file": {"path": largest[1], "bytes": largest[0]}, "errors": errors}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, default=Path(__file__).resolve().parents[1] / "dist")
    args = parser.parse_args()
    result = check(args.dist)
    print(json.dumps(result, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
