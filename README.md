# SecPRBench — results and case explorer

The results website for the **265-case / 530-task** SecPRBench cohort and
**10 reviewer configurations**. It contains the exported results, the case
payloads with pinned source, the saved review trajectories, and the static
website published with GitHub Pages at <https://secprbench.github.io/>.
The benchmark data (original task files and roster) and the evaluation harness
live in the separate [secprbench](https://github.com/secprbench/secprbench)
repository.

The website is dark by design. Its first screen shows the question the
benchmark asks, the full leaderboard for eight direct models (**Include
harnesses** adds the two security harnesses), and a real introducing diff from
the dataset: a review beam sweeps the hunk, the vulnerable lines light up, the
ten reviewer verdicts appear, and the leaderboard bars fill in. Under the
leaderboard, a briefing explains what the reviewer gets and never sees, with
the headline figures and scoring rules, while the diff stays alongside. Below
are a recall heat map by project, a histogram of how many reviewers found each
case, and average detection by bug class. The case explorer provides search and
filters, model detection indicators, introducing/companion commit views, Shiki
syntax highlighting, annotated ground-truth lines, and saved trajectories.
Ground truth is available by hover, keyboard focus, or tap on an annotated line.
Source files and timelines load only when opened.

The release includes **5,290 saved trajectories** and explicitly marks the ten
uncompleted assignments. The original logs total **10.56 GB** and are retained
by the authors; the deployable website is approximately **596 MB**, with case
details and timelines loaded on demand. [Validation and coverage](docs/VALIDATION.md) describe the
integrity checks and remaining annotation limits.

Preview: [results](docs/screenshots/results.png) ·
[case explorer](docs/screenshots/tasks.png) ·
[annotated code](docs/screenshots/code.png).

## Preview locally

Use Node.js 22 or newer and Python 3.10 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To inspect the production build:

```sh
npm run build
python3 scripts/check_site.py
npm run preview
```

No model credentials, Docker daemon, original workspace, or source clones are
needed to build or view the committed website.

## Directory layout

```text
src/                         interactive website
public/data/benchmark.json    small case index and derived leaderboard
public/data/featured.json     compact diff windows for the homepage hero (scripts/export_featured.py)
public/data/cases/            task pairs, pinned code, ground truth, model results
public/data/trajectories/     complete normalized timelines, compressed per run
public/data/trajectory-index.json
public/paper.pdf              arXiv version of the paper
provenance/                   hashes of the published files, the frozen snapshot identity, and mapping coverage
scripts/                      validators and the featured-case exporter
docs/                         publication, trajectory, and design documentation
```

The original logs and the frozen result snapshot are not part of this
repository. The browser-ready compressed timelines **are committed** and are
included in the website build, so a checkout displays the saved reviews on its
own. See [trajectory coverage](docs/TRAJECTORIES.md) for the difference between
the original logs and the normalized public timelines.

## Publish with GitHub Pages

1. Push this repository to `secprbench/secprbench.github.io` with Git.
2. Select **Settings → Pages → Build and deployment → GitHub Actions**.
3. Add a repository variable `PAGES_ENABLED` with value `true` under
   **Settings → Secrets and variables → Actions → Variables**.
4. Run the **Publish results website** workflow, or push an update to `main`.

Without the variable, the workflow validates and builds the site but does not
deploy, which keeps checks green while the repository stays private.

The workflow checks the data and builds/deploys only `dist/`. The site is
served at `https://secprbench.github.io/`; no owner or repository name is
embedded in the application, so it also works under a repository subpath. Hash
routes preserve links to cases and filters. See
[publication instructions](docs/PUBLISHING.md) for release metadata and
independent validation.

## Interpretation

- Recall is target detections divided by all 265 assigned buggy cases. The
  Anthropic harness's five missing pairs remain in the denominator.
- The ten available configurations represent eight direct reviewers and two
  security harnesses,
  not ten distinct underlying models.
- Missing results differ from completed reviews that did not detect the target.
- Companion target-hit verdicts are not measurements of the false-positive rate.
- Red annotations use evidenced mappings to the introducing source. Unmapped
  reference locations remain visible as reference information; no line is
  invented or highlighted merely to make the display look complete.
- These are frozen historical results. Packaging performed no new scanner,
  judge, or vulnerability execution.

Source and distribution scope is documented in [NOTICE](NOTICE). Design
references and implementation choices are recorded in [DESIGN.md](docs/DESIGN.md).
