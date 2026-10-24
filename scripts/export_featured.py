#!/usr/bin/env python3
"""Select compact buggy diffs with a validated vulnerable line for the homepage hero.

Reads the committed public case payloads only; no model calls, no original workspace.
Writes public/data/featured.json with a short diff window per featured case.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WINDOW_BEFORE, WINDOW_AFTER, MAX_WIDTH, MAX_PER_PROJECT, MAX_TOTAL = 7, 6, 96, 2, 14
HUNK = re.compile(r'^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@')


def parse(diff: str):
    new, old, in_hunk, rows = 0, 0, False, []
    for text in diff.split('\n'):
        match = HUNK.match(text)
        if match:
            old, new, in_hunk = int(match.group(1)), int(match.group(2)), True
            rows.append({'kind': 'hunk', 'old': None, 'new': None, 'text': text})
        elif not in_hunk or text.startswith('\\'):
            continue
        elif text.startswith('+'):
            rows.append({'kind': 'add', 'old': None, 'new': new, 'text': text[1:]}); new += 1
        elif text.startswith('-'):
            rows.append({'kind': 'delete', 'old': old, 'new': None, 'text': text[1:]}); old += 1
        elif text.startswith(' '):
            rows.append({'kind': 'context', 'old': old, 'new': new, 'text': text[1:]}); old += 1; new += 1
    return rows


def candidates(root: Path):
    benchmark = json.loads((root / 'public/data/benchmark.json').read_text())
    summaries = {case['id']: case for case in benchmark['cases']}
    for path in sorted((root / 'public/data/cases').glob('*.json.gz')):
        detail = json.loads(gzip.decompress(path.read_bytes()))
        for file in detail['tasks']['buggy']['files']:
            annotations = [a for a in file.get('annotations', []) if a.get('mapping') == 'validated']
            if not annotations or not file.get('diff'):
                continue
            rows = parse(file['diff'])
            hits = [i for i, row in enumerate(rows) if row['kind'] == 'add' and row['new'] is not None
                    and any(a['startLine'] <= row['new'] <= a['endLine'] for a in annotations)]
            if not hits:
                continue
            start = max(0, hits[0] - WINDOW_BEFORE)
            end = min(len(rows), hits[0] + WINDOW_AFTER + 1)
            window = rows[start:end]
            if any(len(row['text'].expandtabs(4)) > MAX_WIDTH for row in window) or len(rows) > 120:
                continue
            summary = summaries[detail['id']]
            yield {
                'id': detail['id'], 'slug': detail['slug'], 'project': detail['project'], 'bugId': detail['bugId'],
                'title': detail['title'], 'bugType': detail['bugType'], 'severity': detail['severity'],
                'path': file['path'], 'commitSha': summary['commitSha'], 'detections': summary['detections'],
                'finding': annotations[0].get('title') or '',
                'lines': [{'kind': r['kind'], 'old': r['old'], 'new': r['new'], 'text': r['text'].expandtabs(4)} for r in window],
                'hits': [i - start for i in hits if start <= i < end],
                'diffRows': len(rows),
            }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    chosen, per_project = [], {}
    for item in sorted(candidates(args.root), key=lambda c: (c['diffRows'], c['id'])):
        if per_project.get(item['project'], 0) >= MAX_PER_PROJECT or any(c['id'] == item['id'] for c in chosen):
            continue
        chosen.append(item); per_project[item['project']] = per_project.get(item['project'], 0) + 1
        if len(chosen) >= MAX_TOTAL:
            break
    output = args.root / 'public/data/featured.json'
    output.write_text(json.dumps({'schemaVersion': 1, 'source': 'public/data/cases', 'cases': chosen}, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps({'featured': len(chosen), 'projects': per_project, 'bytes': output.stat().st_size}))


if __name__ == '__main__':
    main()
