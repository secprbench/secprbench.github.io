# Selected scanner trajectories

The frozen 265-case, ten-configuration result snapshot selects **5,300 assigned
reviews**: one introducing review and one companion review for every model and
case. The export follows each record's `original_output`; it does not substitute
a later retry, choose the longest log, or re-run a model. Missing assignments stay
missing and remain in evaluation denominators.

This export contains **5,290 available trajectories** and **10 missing assignments**
(the five incomplete Anthropic-harness pairs). The timelines were derived from
89,090 selected original and supporting files, totaling 10,562,150,141 bytes.
The public gzip timelines contain 767,077 events in 521,301,329 bytes, with zero
parsing or selected-hash binding errors. The machine-readable index is
authoritative for these counts.

## Original logs and public timelines

The original scanner logs (raw Claude streams, normalized session logs, Codex
event logs, harness logs, prompts, findings, and each selected run's saved
supporting text) are retained by the authors. They are not part of this
repository or the website.

`public/data/trajectories/<case>/<model>/<task-type>.json.gz` contains a complete
browser timeline derived from the saved events. Each file is fetched on demand.
It retains saved user/assistant messages, tool arguments, tool outputs, recorded
reasoning text, and errors. No character budget is applied to message content.
Progress events duplicated by a completed command, empty messages, token counters,
and transport signatures are omitted from this presentation. The viewer can
paginate or collapse events without deleting them.

Public timelines replace recognizable provider tokens, authorization credentials,
and named API/account token assignments with `[REDACTED_CREDENTIAL]`. Host home and
storage prefixes are normalized. The export recorded replacement counts, never
credential values. These pattern checks are a documented publication safeguard,
not a proof that arbitrary text can never contain a secret.

The compact `public/data/trajectory-index.json` contains every assignment and its
status. Each timeline contains the inventory (name, size, SHA-256) of the
original files it was derived from; index file lists show only primary
artifacts. File paths beginning `archive/` in that inventory are provenance
references to the authors' copy, not website download URLs. The gzip timeline
itself is the public download.

## Provenance and interpretation

Each timeline records its task hash and selected findings hash. Both the native
`original_output/findings.json` and the selected source report had to match the
frozen findings hash before the timeline was labeled `available`. Any frozen
raw-log hash was also checked when the snapshot provided one. The repository
check confirms that every timeline's task hash and verdict agree with the case
payload shown on the website.

`selected-judge.json` and `selected-judge-input.json` contain the currently selected
Opus 5.5/high judging artifacts, checked against the frozen record. A native
`verdict.json` can belong to an earlier judge and is retained only as historical
run output. Website scores come from the selected frozen snapshot, not that older
native verdict.

Statuses are explicit:

- `available`: selected findings bind correctly and saved events can be shown.
- `assignment_missing`: no completed selected run is present in the snapshot.
- `completed_no_available_trajectory`: a completed report exists but saved events
  cannot be found; this is different from an unperformed assignment.
- `binding_error`: a selected-source hash or parsing check needs attention; the
  export does not silently claim exact provenance.

The historical `benign` task type is shown as **companion** in the website. A
companion target-hit result is not a general measurement of false positives.

## Check

Python 3.10 or newer is required; the script needs only the standard library.
An ordinary GitHub checkout can validate every public compressed file, event
count, credential-pattern check, and assignment against the case payloads:

```sh
python3 scripts/check_trajectories.py
```

The command executes no vulnerable code, proof of concept, scanner, or judge.
