#!/usr/bin/env python3
"""Check every public trajectory timeline against the index and the case payloads.

The check reads only committed files. It confirms that each timeline is the
file the index describes, that it belongs to the assignment it claims, that its
task hash and verdict agree with the case payload, and that no credential-shaped
string remains in the published text.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KINDS = ('buggy', 'benign')

# Public timelines were exported with these replacements; the check rejects any survivor.
TOKEN_PATTERNS = [
    ('provider_token', re.compile(r'\b(?:sk-(?:ant-[A-Za-z0-9_-]+|proj-[A-Za-z0-9_-]+|[A-Za-z0-9_-]{20,})|xai-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b')),
    ('authorization', re.compile(r'(?i)(\b(?:authorization|proxy-authorization)\s*["\x27]?\s*[:=]\s*["\x27]?\s*(?:Bearer|Basic)\s+)[A-Za-z0-9_./+=-]{20,}')),
    ('api_key_assignment', re.compile(r'(?i)(\b(?:x-api-key|api[_-]?key)\s*["\x27]?\s*[:=]\s*["\x27]?)[A-Za-z0-9_./+=-]{20,}')),
    ('credential_assignment', re.compile(r'(?i)(\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|GH_TOKEN|AWS_SECRET_ACCESS_KEY|CLAUDE_CODE_OAUTH_TOKEN)\s*["\x27]?\s*[:=]\s*["\x27]?)[A-Za-z0-9_./+=-]{20,}')),
    ('aws_access_key', re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b')),
]


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def read_json(path: Path) -> dict:
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)


def contained(root: Path, path: str) -> Path:
    result = root / path
    if not result.resolve().is_relative_to(root.resolve()) or result.is_symlink():
        raise ValueError(f'Unsafe inventory path: {path}')
    return result


def check(root: Path) -> int:
    index = read_json(root / 'public/data/trajectory-index.json')
    benchmark = read_json(root / 'public/data/benchmark.json')
    model_ids = {m['id'] for m in benchmark['models']}
    details = {c['id']: read_json(root / 'public' / c['detailPath']) for c in benchmark['cases']}
    errors: list[str] = []
    expected = set()
    statuses: Counter = Counter()
    public_bytes = events = original_files = original_bytes = 0
    triples = set()
    if index['snapshotSha256'] != benchmark['release']['snapshotSha256']:
        errors.append('Trajectory index and benchmark index name different frozen snapshots')
    for case, models in index['cases'].items():
        detail = details.get(case)
        if detail is None:
            errors.append(f'Index names a case outside the cohort: {case}')
            continue
        for model, tasks in models.items():
            if model not in model_ids:
                errors.append(f'Index names an unknown configuration: {case}/{model}')
                continue
            for task_type, item in tasks.items():
                identity = (case, model, task_type)
                triples.add(identity)
                statuses[item['status']] += 1
                shown = detail['results'][model][task_type]
                task_sha = detail['tasks'][task_type]['sha256']
                if item['taskSha256'] != task_sha or item['detected'] != shown['detected'] or item['scanned'] != shown['scanned']:
                    errors.append(f'Index disagrees with the case payload {identity}')
                if item['status'] == 'assignment_missing':
                    if shown['scanned']:
                        errors.append(f'Completed scan mislabeled missing {identity}')
                    if item.get('viewPath'):
                        errors.append(f'Missing assignment has invented timeline {identity}')
                    continue
                path = contained(root / 'public', item['viewPath'])
                expected.add(path.resolve())
                raw = path.read_bytes()
                public_bytes += len(raw)
                if sha256(raw) != item['sha256'] or len(raw) != item['bytes']:
                    errors.append(f'Timeline hash/size mismatch {identity}')
                expanded = gzip.decompress(raw)
                if len(expanded) != item['uncompressedBytes']:
                    errors.append(f'Timeline uncompressed size mismatch {identity}')
                view = json.loads(expanded)
                if (view['caseId'], view['modelId'], view['taskType']) != identity:
                    errors.append(f'Timeline identity mismatch {identity}')
                if view['taskSha256'] != task_sha:
                    errors.append(f'Timeline task hash differs from the case payload {identity}')
                if view['truncated'] or len(view['events']) != item['eventCount']:
                    errors.append(f'Truncated or incorrect event count {identity}')
                if view['status'] == 'available' and not (view['binding']['nativeFindingsMatched'] and view['binding']['selectedFindingsMatched']):
                    errors.append(f'Available timeline lacks findings binding {identity}')
                ids = [event['id'] for event in view['events']]
                if len(ids) != len(set(ids)):
                    errors.append(f'Duplicate event IDs {identity}')
                for event in view['events']:
                    if not isinstance(event.get('content'), str):
                        errors.append(f'Non-text event content {identity}')
                        continue
                    for name, pattern in TOKEN_PATTERNS:
                        if pattern.search(event['content']):
                            errors.append(f'Credential-shaped {name} remains in public timeline {identity}')
                            break
                events += len(view['events'])
                original_files += len(view['files'])
                original_bytes += sum(f['bytes'] for f in view['files'])
    actual = {p.resolve() for p in (root / 'public/data/trajectories').rglob('*') if p.is_file()}
    if expected != actual:
        errors.append(f'Unexpected/missing public trajectory files: extra {len(actual - expected)}, missing {len(expected - actual)}')
    every_assignment = {(case, model, kind) for case in details for model in model_ids for kind in KINDS}
    if triples != every_assignment:
        errors.append('Trajectory index does not cover exactly every case, configuration, and task type')
    summary = index['summary']
    for key, value in [('assigned', len(triples)), ('events', events), ('publicBytes', public_bytes),
                       ('files', original_files), ('bytes', original_bytes)]:
        if summary[key] != value:
            errors.append(f'Incorrect summary {key}: expected {value}, got {summary[key]}')
    if dict(statuses) != summary['statuses']:
        errors.append('Incorrect status summary')
    result = {'ok': not errors, 'assigned': len(triples), 'statuses': dict(statuses),
              'events': events, 'publicBytes': public_bytes, 'errors': errors}
    print(json.dumps(result, indent=2))
    return 0 if not errors else 1


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--public-only', action='store_true', help='Accepted for compatibility; only public files are ever checked')
    args = parser.parse_args()
    sys.exit(check(args.root.resolve()))


if __name__ == '__main__':
    main()
