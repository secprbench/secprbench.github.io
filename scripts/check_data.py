#!/usr/bin/env python3
"""Offline integrity and consistency checks for the published results data.

Every check uses only files in this repository: the hash manifest, the small
benchmark index, and the per-case payloads. Nothing is downloaded or executed.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASES = 265
CONFIGURATIONS = 10
KINDS = ('buggy', 'benign')


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)


def check_manifest(root: Path, errors: list[str]) -> dict:
    manifest = json.loads((root / 'provenance/data_manifest.json').read_text())
    listed = set()
    for item in manifest['files']:
        rel = item['path']
        path = root / rel
        if rel in listed:
            errors.append(f'Duplicate manifest path: {rel}')
        listed.add(rel)
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
            errors.append(f'Unsafe manifest path: {rel}')
        elif not path.is_file():
            errors.append(f'Missing file: {rel}')
        elif path.stat().st_size != item['bytes'] or digest(path) != item['sha256']:
            errors.append(f'Hash or size mismatch: {rel}')
    actual = {p.relative_to(root).as_posix() for p in (root / 'public/data').rglob('*')
              if p.is_file() and 'trajectories' not in p.relative_to(root).parts}
    if actual != listed:
        errors.append(f'Public data files differ from the manifest: extra {sorted(actual - listed)[:5]}, '
                      f'missing {sorted(listed - actual)[:5]}')
    paper = json.loads((root / 'provenance/paper.json').read_text())
    paper_path = root / paper['path']
    if not paper_path.is_file() or paper_path.stat().st_size != paper['bytes'] or digest(paper_path) != paper['sha256']:
        errors.append('Paper hash or size mismatch')
    return manifest


def check(root: Path) -> dict:
    errors: list[str] = []
    manifest = check_manifest(root, errors)
    if errors:
        return {'ok': False, 'errors': errors}
    data = read_json(root / 'public/data/benchmark.json')
    release = data['release']
    case_ids = {c['id'] for c in data['cases']}
    model_ids = {m['id'] for m in data['models']}
    if len(case_ids) != CASES or len(data['cases']) != CASES or len(model_ids) != CONFIGURATIONS:
        errors.append('Incorrect case or configuration count')
    expected_release = (CASES, 2 * CASES, 2 * CASES * CONFIGURATIONS, CONFIGURATIONS)
    if (release['caseCount'], release['taskCount'], release['recordCount'], release['configurationCount']) != expected_release:
        errors.append('Release counts differ from the cohort size')
    if release['snapshotSha256'] != manifest['snapshotSha256']:
        errors.append('Index and manifest name different frozen snapshots')
    project_counts = Counter(c['project'] for c in data['cases'])
    for project in data['projects']:
        if project_counts[project['id']] != project['cases']:
            errors.append(f'Project count mismatch: {project["id"]}')
    detected: Counter = Counter()
    missing: Counter = Counter()
    by_project: dict[tuple[str, str], Counter] = {}
    totals: Counter = Counter()
    for case in data['cases']:
        detail = read_json(root / 'public' / case['detailPath'])
        if detail['id'] != case['id'] or detail['project'] != case['project'] or set(detail['results']) != model_ids:
            errors.append(f'Case identity/configuration mismatch: {case["id"]}')
            continue
        for kind in KINDS:
            task = detail['tasks'][kind]
            if not re.fullmatch(r'[0-9a-f]{64}', task.get('sha256', '')) or not task.get('commit', {}).get('sha'):
                errors.append(f'Task without original hash or pinned revision: {case["id"]}/{kind}')
            for file in task['files']:
                annotations = file.get('annotations', [])
                if kind == 'benign' and annotations:
                    errors.append(f'Bug annotation transferred to fixed companion: {case["id"]}/{file["path"]}')
                for annotation in annotations:
                    if annotation['mapping'] != 'validated' or not file.get('content'):
                        errors.append(f'Unvalidated red annotation: {case["id"]}/{file["path"]}')
                    elif not 1 <= annotation['startLine'] <= annotation['endLine'] <= len(file['content'].splitlines()):
                        errors.append(f'Annotation outside source: {case["id"]}/{file["path"]}')
            for model_id in model_ids:
                shown = detail['results'][model_id][kind]
                if any(field not in shown for field in ('scanned', 'judged', 'detected', 'status')):
                    errors.append(f'Incomplete result record: {case["id"]}/{model_id}/{kind}')
                    continue
                if kind != 'buggy':
                    continue
                expected = ('missing' if not shown['scanned'] else 'unjudged' if not shown['judged']
                            else 'detected' if shown['detected'] else 'missed')
                if case['detections'][model_id] != expected:
                    errors.append(f'Detection icon differs: {case["id"]}/{model_id}')
                detected[model_id] += bool(shown['detected'])
                missing[model_id] += not shown['scanned']
                project = by_project.setdefault((model_id, case['project']), Counter())
                project['assigned'] += 1
                project['detected'] += bool(shown['detected'])
        cov = detail['groundTruth']['mappingCoverage']
        if cov['unmapped'] != len(detail['groundTruth']['unmappedLocations']):
            errors.append(f'Unmapped annotation count mismatch: {case["id"]}')
        actual_ranges = sum(len(f.get('annotations', [])) for f in detail['tasks']['buggy']['files'])
        if actual_ranges != cov['annotationRanges'] or actual_ranges != case['annotationCount']:
            errors.append(f'Annotation range count mismatch: {case["id"]}')
        if cov['partial'] != len(detail['groundTruth'].get('excerptMappings', [])):
            errors.append(f'Excerpt mapping count mismatch: {case["id"]}')
        totals['total'] += cov['total']
        totals['mapped'] += cov['mapped']
        totals['partial'] += cov['partial']
        totals['annotationRanges'] += cov['annotationRanges']
        totals['casesWithMapped'] += bool(cov['mapped'])
        totals['casesWithoutMapped'] += not bool(cov['mapped'])
    for model in data['models']:
        metrics = model['metrics']
        found = detected[model['id']]
        if metrics['assigned'] != CASES or metrics['detected'] != found or metrics['missing'] != missing[model['id']]:
            errors.append(f'Model detection count mismatch: {model["id"]}')
        if abs(metrics['recall'] - found / CASES) > 1e-12:
            errors.append(f'Incorrect recall denominator: {model["id"]}')
        for project in data['projects']:
            shown = model['projects'][project['id']]
            aggregate = by_project.get((model['id'], project['id']), Counter())
            if shown['assigned'] != aggregate['assigned'] or shown['detected'] != aggregate['detected']:
                errors.append(f'Incorrect project metric: {model["id"]}/{project["id"]}')
    if dict(totals) != release['annotationCoverage'] or dict(totals) != manifest['annotationCoverage']:
        errors.append('Annotation coverage totals differ')
    expected_details = {'public/' + c['detailPath'] for c in data['cases']}
    actual_details = {p.relative_to(root).as_posix() for p in (root / 'public/data/cases').iterdir() if p.is_file()}
    if expected_details != actual_details:
        errors.append('Missing or unexpected public case payload')
    return {'ok': not errors, 'cases': len(case_ids), 'tasks': len(case_ids) * 2,
            'configurations': len(model_ids), 'records': len(case_ids) * 2 * len(model_ids),
            'manifestFiles': len(manifest['files']), 'annotationCoverage': dict(totals), 'errors': errors}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    result = check(args.root.resolve())
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result['ok'] else 1)


if __name__ == '__main__':
    main()
