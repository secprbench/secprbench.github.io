import { useEffect, useState } from 'react'
import type { Benchmark } from './types'
import { assetUrl, BENCHMARK_REPO, fetchJson } from './data'
import { Icon } from './icons'
import { HomePage } from './Home'
import { TasksPage } from './Tasks'
import { Loading, Notice } from './ui'

export { Loading, ModelMark, Notice } from './ui'

export function Logo({ size = 40 }: { size?: number }) {
  // A diff with one flagged line: the benchmark in one glyph.
  return <svg className="brand-logo" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <defs><linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b3b4a" /><stop offset="1" stopColor="#0d1a24" /></linearGradient></defs>
    <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#logo-bg)" stroke="#2b4a5c" />
    <rect x="10" y="11" width="13" height="3" rx="1.5" fill="#9be9f0" opacity=".85" />
    <rect x="10" y="18.5" width="20" height="3" rx="1.5" fill="#ff6b7a" />
    <rect x="10" y="26" width="16" height="3" rx="1.5" fill="#5ad28a" opacity=".8" />
    <path d="M6.5 20h2.5M7.75 18.75v2.5" stroke="#ff6b7a" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M31 31.5 36 36.5" stroke="#9be9f0" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="27.5" cy="28" r="5" fill="none" stroke="#9be9f0" strokeWidth="2.2" />
  </svg>
}

function Brand() {
  return <a className="brand" href="#/results" aria-label="SecPRBench home"><Logo /><span>SecPR<span className="brand-light">Bench</span><small>Security review benchmark</small></span></a>
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/results')
  const [data, setData] = useState<Benchmark>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/results')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    let active = true
    setError('')
    fetchJson<Benchmark>('data/benchmark.json').then(value => { if (active) setData(value) }).catch(value => { if (active) setError(String(value.message || value)) })
    return () => { active = false }
  }, [attempt])
  const page = route.startsWith('#/tasks') ? 'tasks' : 'results'
  useEffect(() => {
    document.title = `${page === 'tasks' ? 'Case explorer' : 'Results'} · SecPRBench`
    if (route !== '#leaderboard') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page, route])

  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); const main = document.getElementById('main-content'); main?.focus(); main?.scrollIntoView() }}>Skip to content</a>
    <header className="site-header"><div className="header-inner"><Brand /><nav aria-label="Main navigation">
      {[['results', 'Results', 'chart'], ['tasks', 'Case explorer', 'code']].map(([id, label, icon]) => <a className={page === id ? 'active' : ''} href={`#/${id}`} key={id} aria-label={id === 'tasks' ? 'Tasks' : label} aria-current={page === id ? 'page' : undefined}><Icon name={icon} size={16} />{label}</a>)}
    </nav><div className="header-links"><a className="text-link" href={BENCHMARK_REPO} target="_blank" rel="noreferrer">GitHub <Icon name="external" size={14} /></a><a className="text-link header-paper" href={assetUrl('paper.pdf')} target="_blank" rel="noreferrer">Paper <Icon name="external" size={14} /></a></div></div></header>
    <main id="main-content" className="main-shell" tabIndex={-1}>
      {error ? <div className="page-error"><Notice error><h2>Results could not be loaded</h2><p>{error}</p><button className="button secondary" onClick={() => setAttempt(attempt + 1)}>Try again</button></Notice></div> : !data ? <Loading /> : page === 'tasks' ? <TasksPage data={data} route={route} /> : <HomePage data={data} />}
    </main>
    <footer className="site-footer"><span className="footer-title">SecPRBench</span><div className="footer-links"><a href="#/tasks">Cases</a><a href={BENCHMARK_REPO} target="_blank" rel="noreferrer">Benchmark repository</a><a href={assetUrl('data/benchmark.json')} download>Results data <Icon name="download" size={13} /></a></div></footer>
  </>
}
