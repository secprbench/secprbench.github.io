# Publishing the results website

The website is a self-contained static application. Its tracked source and
compressed public data are sufficient for a fresh GitHub checkout. The benchmark
runner, source clones, credentials, and original logs are not needed by the
build or the published site.

## GitHub Pages

The site is published from the organization repository
`secprbench/secprbench.github.io`, so GitHub serves it at the organization root
`https://secprbench.github.io/`. Push the `main` branch with Git; the data files
are too many for the browser upload form.

In the repository, choose **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Run the **Publish results website** workflow. It also runs on
pushes to `main`; pull requests build and test without deployment.

The workflow validates frozen data, compressed timelines, and browser behavior,
then publishes only `dist/`. Links use the build's relative base and hash
routes, so the same build also works under a repository subpath. A custom domain
can be configured through GitHub later.

The first deployment requires Pages to be enabled. If GitHub asks to approve
the `github-pages` environment, configure its permitted branch as `main`.
The repository does not require model-provider secrets.

## Data provenance

`provenance/data_manifest.json` lists the SHA-256 and size of every published
data file except the per-run timelines, whose hashes are in
`public/data/trajectory-index.json`. It also records the SHA-256 of the frozen
ten-configuration result snapshot that the export was taken from.

The original task files are distributed in the
[secprbench](https://github.com/secprbench/secprbench) repository; each case
payload here carries the SHA-256 of the original task it was built from, and
`data/roster.json` in that repository records the same hashes. The frozen result
snapshot and the original review logs (over 10 GB) are retained by the authors
and are not part of this repository or the website. The public timelines in
`public/data/trajectories/` are complete normalized projections of those logs,
with the redactions documented in [TRAJECTORIES.md](TRAJECTORIES.md). Each
timeline is fetched only when a visitor opens it and can be downloaded from its
case page. The ten uncompleted assignments have explicit missing entries rather
than fabricated logs.

`scripts/check_site.py` enforces a 900 MB output budget, leaving headroom below
GitHub Pages' 1 GB site limit, and rejects individual files at or above GitHub's
100 MiB normal-Git limit. Compression is part of the checked-in data format;
the frontend handles gzip whether served as a file or decoded by the host.

## Featured hero cases

`public/data/featured.json` holds fourteen short diff windows, each containing
a validated vulnerable line, chosen from the committed case payloads by
`python3 scripts/export_featured.py`. It reads only `public/data`, so it can be
regenerated on any checkout; rerun it and update `provenance/data_manifest.json`
if the case payloads change.

## Independent verification

```sh
npm ci
python3 scripts/check_data.py
python3 scripts/check_trajectories.py
npm run build
python3 scripts/check_site.py
npx playwright install chromium
npx playwright test
```

Browser tests serve the build beneath a repository subpath, which exercises the
relative-base behavior that also applies at the organization root. A local
existing Chromium executable can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Research release metadata

Confirm the final paper URL, author
and citation information, licenses for author-owned artifacts, and third-party
distribution scope when making the research release public. Existing retained
case caveats and ground-truth mapping limits stay visible in the explorer.

References:

- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
