import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Benchmark, Featured, FeaturedCase, Model } from './types'
import { BENCHMARK_REPO, fetchJson, modelColor, percent, reducedMotion } from './data'
import { Icon } from './icons'
import { ModelMark } from './ui'

const number = (value: number) => value.toLocaleString('en-US')

/** Counts up once from zero when the element first becomes visible. */
function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(reducedMotion() ? target : 0)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (reducedMotion()) { setValue(target); return }
    const element = ref.current
    if (!element) return
    let frame = 0
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
        if (t < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }, { threshold: 0.4 })
    observer.observe(element)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [target, duration])
  return { value, ref }
}

function Stat({ value, label }: { value: number; label: string }) {
  const count = useCountUp(value)
  return <div className="stat"><strong ref={count.ref as React.RefObject<HTMLElement>}>{number(count.value)}</strong><span>{label}</span></div>
}

/** A real introducing diff from the dataset. A review beam sweeps the hunk, then the vulnerable lines light up. */
function DiffStage({ data, featured, onLit }: { data: Benchmark; featured: FeaturedCase[]; onLit?: () => void }) {
  const [index, setIndex] = useState(0)
  const [lit, setLit] = useState(reducedMotion())
  const current = featured[index]
  useEffect(() => { setLit(reducedMotion()) }, [index])
  useEffect(() => { if (lit) onLit?.() }, [lit, onLit])
  if (!current) return null
  const found = data.models.filter(model => current.detections[model.id] === 'detected').length
  const caseLink = `#/tasks?case=${encodeURIComponent(current.id)}`
  const project = data.projects.find(item => item.id === current.project)
  return <figure className="diff-stage" aria-label={`Featured case ${current.id}`}>
    <div className="stage-bar">
      <span className="stage-dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="stage-path"><Icon name="file" size={13} />{current.path}</span>
      <span className="stage-project">{project?.label || current.project}</span>
    </div>
    <div className="stage-code" key={current.id}>
      {!lit && <span className="scan-beam" aria-hidden="true" onAnimationEnd={() => setLit(true)} />}
      {current.lines.map((line, lineIndex) => {
        const hit = current.hits.includes(lineIndex)
        return <div key={lineIndex} className={`stage-line ${line.kind} ${hit ? 'hit' : ''} ${hit && lit ? 'lit' : ''}`}>
          <span className="stage-number">{line.kind === 'hunk' ? '' : line.new ?? line.old ?? ''}</span>
          <span className="stage-sign">{line.kind === 'add' ? '+' : line.kind === 'delete' ? '−' : ''}</span>
          <code>{line.text || ' '}</code>
        </div>
      })}
    </div>
    <figcaption className={`stage-caption ${lit ? 'shown' : ''}`} aria-live="polite">
      <div className="stage-finding">
        <span className="stage-id"><a href={caseLink}>{current.bugId}</a><em>{current.bugType}</em></span>
        <p>{current.title}</p>
      </div>
      <div className="stage-verdict">
        <span className="stage-found"><strong>{found}</strong> of {data.models.length} reviewers found it</span>
        <span className="stage-badges" aria-label="Reviewer verdicts">{data.models.map(model => <span key={model.id} className={`verdict-chip ${current.detections[model.id] || 'missing'}`} style={{ '--model-color': modelColor(model) } as React.CSSProperties} title={`${model.label}: ${current.detections[model.id] === 'detected' ? 'found it' : current.detections[model.id] === 'missed' ? 'missed it' : 'no review'}`}><ModelMark model={model} small /><Icon name={current.detections[model.id] === 'detected' ? 'check' : current.detections[model.id] === 'missed' ? 'close' : 'dash'} size={11} /></span>)}</span>
      </div>
      <div className="stage-actions">
        <a className="button primary" href={caseLink}>Open this case <Icon name="arrow" size={15} /></a>
        <button className="button secondary" onClick={() => setIndex((index + 1) % featured.length)}>Next case</button>
        <span className="stage-counter">{index + 1} / {featured.length}</span>
      </div>
    </figcaption>
  </figure>
}

function Headline() {
  return <section className="headline" aria-labelledby="hero-heading">
    <h1 id="hero-heading">Can a reviewer catch the bug on the day it was committed?</h1>
    <div className="headline-links">
      <a className="text-link" href="#/tasks">Browse cases <Icon name="arrow" size={13} /></a>
      <a className="text-link" href={BENCHMARK_REPO} target="_blank" rel="noreferrer">Data and harness <Icon name="external" size={13} /></a>
    </div>
  </section>
}

// Verification routes from the paper's final verification macros (217 mechanical, 48 human-adjudicated, 265 total).
const VERIFIED = { mechanical: 217, human: 48 }

/** What the reviewer sees, what it never sees, and the numbers behind the benchmark. */
function Briefing({ data }: { data: Benchmark }) {
  const bugClasses = new Set(data.cases.map(item => item.bugType).filter(Boolean)).size
  return <section className="briefing" aria-labelledby="briefing-heading">
    <h2 id="briefing-heading">What the reviewer sees</h2>
    <div className="briefing-lists">
      <ul className="briefing-list gets" aria-label="The reviewer gets">
        <li className="briefing-list-title">The reviewer gets</li>
        <li><Icon name="check" size={14} />The introducing diff, often 100+ lines across several files</li>
        <li><Icon name="check" size={14} />The commit message</li>
        <li><Icon name="check" size={14} />The repository at that commit, without history</li>
        <li><Icon name="check" size={14} />A sandbox to read, grep and build</li>
      </ul>
      <ul className="briefing-list never" aria-label="The reviewer never sees">
        <li className="briefing-list-title">The reviewer never sees</li>
        <li><Icon name="close" size={14} />The advisory or CVE</li>
        <li><Icon name="close" size={14} />The fix or any later commit</li>
        <li><Icon name="close" size={14} />The ground truth</li>
        <li><Icon name="close" size={14} />Which task is the buggy one</li>
      </ul>
    </div>
    <div className="fact-grid">
      <Stat value={data.release.caseCount} label="introducing commits" />
      <Stat value={data.release.taskCount} label="paired review tasks" />
      <Stat value={data.release.projectCount} label="open-source projects" />
      <Stat value={bugClasses} label="bug classes" />
      <Stat value={data.models.length} label="reviewer configurations" />
      <Stat value={data.release.recordCount} label="judged reviews" />
    </div>
    <dl className="fact-lines">
      <div><dt><span className="fact-icon"><Icon name="book" size={15} /></span>Sources</dt><dd>CVE records and public security reports, fixed between January 2025 and June 2026, sampled at random across nine projects.</dd></div>
      <div><dt><span className="fact-icon"><Icon name="shield" size={15} /></span>Verified</dt><dd>{VERIFIED.mechanical} of {data.release.caseCount} cases confirmed by replaying a proof of concept on the parent, buggy and fixed builds; {VERIFIED.human} adjudicated by hand.</dd></div>
      <div><dt><span className="fact-icon"><Icon name="chart" size={15} /></span>Scoring</dt><dd>A criteria-first judge ({data.release.judge.model}) credits only the same causal flaw. Missing reviews count as misses.</dd></div>
      <div><dt><span className="fact-icon"><Icon name="copy" size={15} /></span>Companion</dt><dd>Every buggy task is paired with the fixed version of the same change, to catch reviewers that flag everything.</dd></div>
    </dl>
  </section>
}

function Leaderboard({ data, reviewers, includeHarnesses, setIncludeHarnesses, project, setProject, grown }: { data: Benchmark; reviewers: Model[]; includeHarnesses: boolean; setIncludeHarnesses: (value: boolean) => void; project: string; setProject: (value: string) => void; grown: boolean }) {
  const [sort, setSort] = useState<{ key: 'recall' | 'detected' | 'label'; descending: boolean }>({ key: 'recall', descending: true })
  const models = useMemo(() => reviewers.map(model => ({ ...model, shown: project === 'all' ? model.metrics : model.projects[project] })).filter(model => model.shown).sort((a, b) => {
    const difference = sort.key === 'label' ? a.label.localeCompare(b.label) : a.shown[sort.key] - b.shown[sort.key]
    return sort.descending ? -difference : difference
  }), [reviewers, project, sort])
  function sortBy(key: typeof sort.key) { setSort({ key, descending: sort.key === key ? !sort.descending : key !== 'label' }) }
  return <section className="leaderboard-section" id="leaderboard" aria-labelledby="results-heading">
    <div className="section-heading">
      <div><h2 id="results-heading">Leaderboard</h2><p>Recall on {project === 'all' ? data.release.caseCount : models[0]?.shown.assigned || 0} introducing commits. Missing and failed reviews count against the reviewer.</p></div>
      <div className="table-toolbar">
        <div className="segmented" aria-label="Reviewers">
          <button aria-pressed={!includeHarnesses} className={!includeHarnesses ? 'active' : ''} onClick={() => setIncludeHarnesses(false)}>Direct models</button>
          <button aria-pressed={includeHarnesses} className={includeHarnesses ? 'active' : ''} onClick={() => setIncludeHarnesses(true)}>Include harnesses</button>
        </div>
        <label className="select-label">Project<select aria-label="Project" value={project} onChange={event => setProject(event.target.value)}><option value="all">All projects</option>{data.projects.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </div>
    <div className="table-shell">
      <table className={`leaderboard ${grown ? 'grown' : ''}`}>
        <thead><tr>
          <th className="rank-cell">#</th>
          <th aria-sort={sort.key === 'label' ? sort.descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => sortBy('label')}>Reviewer <Icon name="down" size={13} /></button></th>
          <th className="recall-cell" aria-sort={sort.key === 'recall' ? sort.descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => sortBy('recall')}>Recall <Icon name="down" size={13} /></button></th>
          <th className="numeric detected-cell" aria-sort={sort.key === 'detected' ? sort.descending ? 'descending' : 'ascending' : 'none'}><button onClick={() => sortBy('detected')}>Detected <Icon name="down" size={13} /></button></th>
          <th className="mode-cell">Configuration</th>
          <th className="explore-cell"><span className="sr-only">Explore</span></th>
        </tr></thead>
        <tbody>{models.map((model, index) => <tr data-testid="leaderboard-row" key={model.id} style={{ '--row-index': index } as React.CSSProperties}>
          <td className="rank-cell">{String(index + 1).padStart(2, '0')}</td>
          <td><div className="model-name"><ModelMark model={model} /><div><strong>{model.label}</strong><small className="model-kind">{model.kind === 'harness' ? 'Security harness' : 'Direct review'}</small><small className="mobile-model-metrics">{model.shown.detected}/{model.shown.assigned} detected</small></div></div></td>
          <td className="recall-cell"><div className="recall-value"><strong>{percent(model.shown.recall)}</strong><span className="bar" aria-hidden="true"><span style={{ width: `${Math.min(100, model.shown.recall * 100)}%`, background: modelColor(model) }} /></span></div></td>
          <td className="numeric detected-cell"><strong>{model.shown.detected}</strong><span className="denominator"> / {model.shown.assigned}</span></td>
          <td className="mode-cell"><span className={`kind-pill ${model.kind}`}>{model.kind === 'harness' ? 'Security harness' : 'Direct review'}</span></td>
          <td className="explore-cell"><a className="icon-button" href={`#/tasks?model=${encodeURIComponent(model.id)}&status=detected${project === 'all' ? '' : `&project=${encodeURIComponent(project)}`}`} aria-label={`View cases detected by ${model.label}`}><Icon name="arrow" size={17} /></a></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="recall-note">Bars run from 0 to 100%. Judge: {data.release.judge.model}, {data.release.judge.effort} effort, criteria-first. Click a row's arrow to see the cases that reviewer found.</p>
  </section>
}

function ProjectMatrix({ data, reviewers }: { data: Benchmark; reviewers: Model[] }) {
  const models = [...reviewers].sort((a, b) => b.metrics.recall - a.metrics.recall)
  return <section className="section project-breakdown" aria-labelledby="matrix-heading">
    <div className="section-heading"><div><h2 id="matrix-heading">Recall by project</h2><p>Each cell is one reviewer on one codebase. Darker is better.</p></div><span className="heatmap-legend">Lower <span /> Higher recall</span></div>
    <div className="table-shell"><table className="matrix">
      <thead><tr><th>Reviewer</th>{data.projects.map(project => <th key={project.id}>{project.label}<small>{project.cases} cases</small></th>)}</tr></thead>
      <tbody>{models.map(model => <tr key={model.id}>
        <th><span><ModelMark model={model} small />{model.shortLabel || model.label}</span></th>
        {data.projects.map(project => {
          const metric = model.projects[project.id]
          const mix = metric ? Math.round(4 + Math.pow(metric.recall, 1.6) * 92) : 0
          return <td key={project.id}>{metric ? <a href={`#/tasks?model=${encodeURIComponent(model.id)}&project=${project.id}&status=detected`} className="heat-cell" style={{ backgroundColor: `color-mix(in oklab, var(--cyan-deep) ${mix}%, var(--card))` }} title={`${model.label} · ${project.label}: ${metric.detected}/${metric.assigned} detected`}><strong>{percent(metric.recall)}</strong><small>{metric.detected} / {metric.assigned}</small></a> : <span>—</span>}</td>
        })}
      </tr>)}</tbody>
    </table></div>
  </section>
}

/** How many reviewers found each case: a histogram over the scoped reviewer set. */
function Difficulty({ data, reviewers, includeHarnesses }: { data: Benchmark; reviewers: Model[]; includeHarnesses: boolean }) {
  const ids = reviewers.map(model => model.id)
  const counts = useMemo(() => {
    const bins = Array.from({ length: ids.length + 1 }, () => 0)
    for (const item of data.cases) bins[ids.filter(id => item.detections[id] === 'detected').length] += 1
    return bins
  }, [data, ids.join()])
  const max = Math.max(...counts)
  const width = 560, height = 220, left = 36, bottom = 34, top = 18
  const plotWidth = width - left - 12, plotHeight = height - top - bottom
  const slot = plotWidth / counts.length
  const barWidth = Math.min(24, slot - 6)
  const scope = includeHarnesses ? 'all' : 'direct'
  const byType = useMemo(() => {
    const groups: Record<string, { total: number; found: number }> = {}
    for (const item of data.cases) {
      const group = groups[item.bugType] ||= { total: 0, found: 0 }
      group.total += 1
      group.found += ids.filter(id => item.detections[id] === 'detected').length / Math.max(1, ids.length)
    }
    return Object.entries(groups).filter(([, group]) => group.total >= 2).map(([type, group]) => ({ type, total: group.total, rate: group.found / group.total })).sort((a, b) => b.rate - a.rate)
  }, [data, ids.join()])
  return <section className="section difficulty" aria-labelledby="difficulty-heading">
    <div className="section-heading"><div><h2 id="difficulty-heading">Where the hard cases are</h2><p>Left: how many of the {ids.length} {includeHarnesses ? 'configurations' : 'direct reviewers'} found each of the {data.release.caseCount} bugs. Right: average detection rate by bug class. Click a column to open those cases.</p></div></div>
    <div className="charts">
      <figure className="chart-card">
        <figcaption>Reviewers that found each case</figcaption>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Histogram of cases by number of reviewers that detected them. ${counts.map((count, found) => `${count} cases found by ${found}`).join('; ')}.`}>
          <line x1={left} x2={width - 12} y1={top + plotHeight} y2={top + plotHeight} className="axis" />
          {[0.5, 1].map(fraction => <g key={fraction}><line x1={left} x2={width - 12} y1={top + plotHeight * (1 - fraction)} y2={top + plotHeight * (1 - fraction)} className="grid" /><text x={left - 8} y={top + plotHeight * (1 - fraction) + 4} className="tick" textAnchor="end">{Math.round(max * fraction)}</text></g>)}
          {counts.map((count, found) => {
            const barHeight = max ? plotHeight * count / max : 0
            const x = left + slot * found + (slot - barWidth) / 2
            const extreme = found === 0 || found === ids.length
            return <a key={found} href={`#/tasks?found=${found}&scope=${scope}`} aria-label={`${count} cases found by ${found} of ${ids.length}`}>
              <rect x={left + slot * found} y={top} width={slot} height={plotHeight + bottom} className="hit-area" />
              <rect x={x} y={top + plotHeight - barHeight} width={barWidth} height={barHeight} rx={4} className={`column ${found === 0 ? 'none' : ''} ${found === ids.length ? 'all' : ''}`} style={{ '--delay': `${found * 45}ms` } as React.CSSProperties} />
              {extreme && count > 0 && <text x={x + barWidth / 2} y={top + plotHeight - barHeight - 6} textAnchor="middle" className="value">{count}</text>}
              <text x={x + barWidth / 2} y={top + plotHeight + 18} textAnchor="middle" className="tick">{found}</text>
              <title>{count} cases found by {found} of {ids.length}</title>
            </a>
          })}
          <text x={left + plotWidth / 2} y={height - 4} textAnchor="middle" className="axis-label">reviewers that detected the flaw</text>
        </svg>
        <p className="chart-note"><span className="swatch none" /> {counts[0]} cases that no reviewer found. <span className="swatch all" /> {counts[ids.length]} cases that every reviewer found.</p>
      </figure>
      <figure className="chart-card">
        <figcaption>Average detection rate by bug class</figcaption>
        <div className="bar-list" role="img" aria-label={`Average detection rate by bug class. ${byType.map(row => `${row.type} ${percent(row.rate)} over ${row.total} cases`).join('; ')}.`}>
          {byType.map((row, index) => <a key={row.type} className="bar-row" href={`#/tasks?scope=${scope}`} title={`${row.type}: ${percent(row.rate)} average detection over ${row.total} cases`} style={{ '--delay': `${index * 40}ms` } as React.CSSProperties}>
            <span className="bar-label">{row.type.replace(/([a-z])([A-Z])/g, '$1 $2')}<small>{row.total} cases</small></span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${row.rate * 100}%` }} /></span>
            <span className="bar-value">{percent(row.rate)}</span>
          </a>)}
        </div>
      </figure>
    </div>
  </section>
}


export function HomePage({ data }: { data: Benchmark }) {
  const [featured, setFeatured] = useState<FeaturedCase[]>([])
  const [includeHarnesses, setIncludeHarnesses] = useState(false)
  const [project, setProject] = useState('all')
  useEffect(() => { let active = true; fetchJson<Featured>('data/featured.json').then(value => { if (active) setFeatured(value.cases) }).catch(() => { if (active) setFeatured([]) }); return () => { active = false } }, [])
  const reviewers = useMemo(() => data.models.filter(model => includeHarnesses || model.kind === 'direct'), [data, includeHarnesses])
  // The leaderboard bars grow when the hero scan finishes; a fallback timer covers a missing or slow featured payload.
  const [barsReady, setBarsReady] = useState(reducedMotion())
  const onLit = useCallback(() => setBarsReady(true), [])
  useEffect(() => { const timer = setTimeout(() => setBarsReady(true), 3200); return () => clearTimeout(timer) }, [])
  return <div className="home">
    <Headline />
    <div className="home-band">
      <div className="band-main">
        <Leaderboard data={data} reviewers={reviewers} includeHarnesses={includeHarnesses} setIncludeHarnesses={setIncludeHarnesses} project={project} setProject={setProject} grown={barsReady} />
        <Briefing data={data} />
      </div>
      <div className="band-side"><DiffStage data={data} featured={featured} onLit={onLit} /></div>
    </div>
    <ProjectMatrix data={data} reviewers={reviewers} />
    <Difficulty data={data} reviewers={reviewers} includeHarnesses={includeHarnesses} />
  </div>
}
