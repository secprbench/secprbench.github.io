# Design references and implementation intent

The website is an original SecPRBench design. It uses the following public
benchmark interfaces as references for familiar research navigation:

- [SWE-bench](https://www.swebench.com/): sortable result comparisons and clear
  dataset scope.
- [SEC-bench](https://sec-bench.github.io/): project breakdowns and configuration
  labels.

The homepage contains a short introduction, a recall-first results table, and
the project breakdown. Eight direct models are shown by default; **Include
harnesses** adds both security harnesses to the table and breakdown. Configuration
labels are secondary, and completion counts are omitted. Navigation contains
only Results and Case explorer.

The core reading path is results → filtered cases → annotated commit → saved
review trajectory. Colors reinforce labeled states rather than replace labels.
The code viewer uses Shiki syntax highlighting and a separate red marker for
ground-truth locations, distinct from ordinary added/deleted diff lines.

The result is a static GitHub Pages application. Hash routes keep deep links
working under any repository name. Task details and compressed trajectories
load on demand. The published site contains exported evidence and never calls
a model provider or executes a saved command.

References consulted on 2026-10-11:

- [Shiki](https://shiki.style/guide/install)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Dark redesign (2026-10-23)

- Dark is the only theme. Surfaces are deep slate rather than tinted black, so
  the two functional colors read clearly: diff red marks the vulnerable change,
  cyan marks detection and interactive elements. Model identity colors are the
  data's own hues re-stepped for the dark surface and appear only as marks
  beside text, never as text color.
- Typography: Bricolage Grotesque for headlines, DM Sans for body, JetBrains
  Mono only where the content is code. Ligatures are disabled so `->` renders
  as written in C.
- One orchestrated load sequence: the hero diff scan, the stat counters, and the
  leaderboard bars growing when they scroll into view. Everything else moves
  only in response to the visitor. `prefers-reduced-motion` disables all of it.
- Charts follow thin-mark rules: columns at most 24px, 4px rounded data ends,
  hairline grid, labels only on the extremes, hover titles carry the rest.

## First-screen arrangement (2026-10-23)

- The headline stays as a single compact strip so visitors understand the task
  before reading numbers. Under it, one band: the full leaderboard on the left
  and the featured diff on the right, both visible without scrolling at 1440×900.
- The two halves share one animation: the beam scans the diff, the vulnerable
  lines light up, and the leaderboard bars grow at that moment. "Next case"
  replays only the scan, so the table stays still while browsing cases.
- Below 1150px the band stacks with the leaderboard first; below 850px the
  configuration column folds into a caption under each reviewer name.

## Briefing block (2026-10-23)

- The headline strip carries only the question and two links. The description,
  the "reviewer gets / never sees" lists, six headline figures, and four fact
  lines (collection window, introduction span, scoring, evidence) live in a
  "What the reviewer sees" block directly under the leaderboard, in the same
  left column. The diff stage is sticky and follows the reader down past it.
- Selects draw their own chevron so the arrow sits consistently inside the
  control instead of floating at the browser's default position.
