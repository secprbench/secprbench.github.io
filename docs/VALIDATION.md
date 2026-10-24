# Release validation and coverage

The publication artifact preserves the final 265 cases, 530 paired tasks, and
5,300 assignments across ten reviewer configurations. The frozen result snapshot
has SHA-256
`5049eaf5b9e56df337dc1d7efe7602f3a0664eac1cd811c6145cbf4ffb28fc6f`.
No scanner, model, judge, or vulnerability reproducer was run during packaging.

## Saved trajectories

All 5,290 completed assignments have a saved, bound trajectory. The ten missing
assignments are the five uncompleted Anthropic-harness task pairs. They remain
missing in the explorer and in the assigned-case denominator.

The original logs comprise 89,090 files and 10,562,150,141 bytes; every file
was checked against its recorded SHA-256 during export. They are retained by the
authors and are not part of this repository. Public timelines contain 767,077
events in 521,301,329 compressed bytes. They preserve full saved message content
under the normalization and redaction policy in [TRAJECTORIES.md](TRAJECTORIES.md).

## Ground-truth annotations

All 265 cases retain their ground truth. In 256 cases, at least one reference
location can be mapped reliably to the pinned introducing source. Of the 498
original reference locations, 274 have evidenced mappings, including 43 partial
excerpt mappings, producing 316 highlighted ranges. Partial mappings highlight
only supported anchors, disclose their scope in the popover, and preserve the
original excerpt. Unmapped locations remain available in the reference findings.

Nine cases have no reliable red-line mapping in this export:

- `curl/CVE-2026-5545`
- `freetype/GL-1336`
- `redis/CVE-2024-46981`
- `sqlite/FORUM-97467fa8fa32`
- `sqlite/FORUM-bc94e5dbb63f`
- `wasmtime/CVE-2025-64345`
- `wasmtime/CVE-2026-24116`
- `wasmtime/CVE-2026-34946`
- `wasmtime/CVE-2026-34983`

These are retained benchmark cases. Missing or mismatched source snippets prevent
a confident line annotation; no display coordinate is fabricated. This affects
the visualization, not the frozen scores or case membership.

## Repeatable checks

The repository includes data/hash validation, browser interaction tests, and a
deployment size/path check. Browser tests
exercise a GitHub Pages style repository subpath, including mobile layouts,
filters, overlapping annotations, companion separation, missing reviews, and
compressed trajectory loading. The CI workflow runs these checks before deploy.

Run the commands in [PUBLISHING.md](PUBLISHING.md) to repeat these checks on a
fresh checkout. The continuous-integration workflow runs the same data, size,
and browser checks before every deployment.
Frozen task, result, and trajectory data are unchanged.
