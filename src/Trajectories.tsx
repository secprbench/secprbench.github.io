import { useEffect, useMemo, useState } from 'react'
import type { Benchmark, CaseDetail, Trajectory, TrajectoryIndex } from './types'
import { assetUrl, fetchJson, readable } from './data'
import { Icon } from './icons'
import { Loading, ModelMark, Notice } from './ui'

let indexPromise: Promise<TrajectoryIndex> | undefined
function trajectoryIndex() { if (!indexPromise) indexPromise = fetchJson<TrajectoryIndex>('data/trajectory-index.json').catch(error => { indexPromise = undefined; throw error }); return indexPromise }

export function Trajectories({ caseId, data, detail, taskType }: { caseId: string; data: Benchmark; detail: CaseDetail; taskType: 'buggy' | 'benign' }) {
  const [modelId, setModelId] = useState(data.models[0].id)
  const [index, setIndex] = useState<TrajectoryIndex>()
  const [trajectory, setTrajectory] = useState<Trajectory>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [visible, setVisible] = useState(30)
  useEffect(() => { let active = true; setError(''); trajectoryIndex().then(value => { if (active) setIndex(value) }).catch(value => { if (active) setError(value.message) }); return () => { active = false } }, [attempt])
  useEffect(() => { setTrajectory(undefined); setError(''); setLoading(false); setVisible(30); setSearch(''); setRole('all') }, [modelId, taskType])
  const model = data.models.find(item => item.id === modelId)!
  const result = detail.results[modelId]?.[taskType]
  const reference = index?.cases[caseId]?.[modelId]?.[taskType]
  const events = useMemo(() => trajectory?.events.filter(event => (role === 'all' || event.role === role) && `${event.name || ''} ${event.type} ${readable(event.content)}`.toLowerCase().includes(search.toLowerCase())) || [], [trajectory, role, search])
  const roles = [...new Set(trajectory?.events.map(event => event.role) || [])]
  const [requestId, setRequestId] = useState(0)
  useEffect(() => {
    if (!requestId || !reference?.viewPath) return
    let active = true; setError(''); setLoading(true)
    fetchJson<Trajectory>(reference.viewPath).then(value => { if (active) setTrajectory(value) }).catch(value => { if (active) setError(value.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // A model switch resets the view; opening the new model is an explicit action.
  }, [requestId])
  return <div className="trajectory-panel"><div className="trajectory-header"><div><Icon name="terminal" size={20}/><h3>Inside the review</h3><span className="historical-label">SAVED TRAJECTORY</span></div><label className="sr-only" htmlFor={`trajectory-model-${detail.slug}`}>Trajectory reviewer</label><select id={`trajectory-model-${detail.slug}`} value={modelId} onChange={event => { setModelId(event.target.value); setRequestId(0) }}>{data.models.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></div><div className="trajectory-reviewer"><ModelMark model={model} /><div><strong>{model.label}</strong><small>{model.harness} · {taskType === 'buggy' ? 'Introducing commit' : 'Fix companion'}</small></div><span className={`verdict-chip ${result?.detected ? 'detected' : !result?.scanned ? 'missing' : 'missed'}`}><Icon name={result?.detected ? 'check' : !result?.scanned ? 'dash' : 'close'} size={14}/>{result?.detected ? 'Target detected' : !result?.scanned ? 'Review missing' : !result?.judged ? 'Not judged' : 'Target not detected'}</span></div>
    {!index && !error && <Loading text="Loading trajectory availability…" />}
    {error && <Notice error><p>{error}</p><button className="button secondary" onClick={() => { if (reference?.viewPath) setRequestId(requestId + 1); else setAttempt(attempt + 1) }}>Retry</button></Notice>}
    {index && !reference?.viewPath && <div className="trajectory-empty"><Icon name="terminal" size={30}/><h4>No saved trajectory available</h4><p>{reference?.status === 'missing' ? 'This assigned review has no saved run in the selected evaluation snapshot.' : 'The selected evaluation has no published trajectory artifact for this case and configuration.'} The case remains in the recall denominator.</p></div>}
    {reference?.viewPath && !trajectory && !loading && <div className="trajectory-open"><div><span className="eyebrow">REVIEW LOG</span><h4>{reference.eventCount?.toLocaleString() || 'Saved'} events, open for inspection.</h4><p>Read the model’s saved messages, tool calls, and outputs. Large logs are loaded only when you open them.</p></div><button className="button primary" onClick={() => setRequestId(requestId + 1)}>Open trajectory <Icon name="arrow" size={16}/></button></div>}
    {loading && <Loading text="Loading and unpacking review trajectory…" />}
    {trajectory && <><div className="trajectory-tools"><label className="trajectory-search"><Icon name="search" size={16}/><input aria-label="Search trajectory" type="search" placeholder="Search messages and tool calls…" value={search} onChange={event => { setSearch(event.target.value); setVisible(30) }}/></label><select aria-label="Event role" value={role} onChange={event => { setRole(event.target.value); setVisible(30) }}><option value="all">All roles</option>{roles.map(value => <option key={value}>{value}</option>)}</select><a className="download-link" href={assetUrl(reference!.viewPath!)} download><Icon name="download" size={15}/> JSON.gz</a></div><div className="trajectory-event-count">{events.length.toLocaleString()} matching events · {trajectory.events.length.toLocaleString()} total{trajectory.truncated && <strong> · This saved view is truncated; consult the artifact metadata.</strong>}</div><div className="trajectory-events">{events.slice(0, visible).map((event, eventIndex) => { const content = readable(event.content); return <details className={`trajectory-event role-${event.role}`} data-testid="trajectory-event" key={`${event.id}-${eventIndex}`} open={eventIndex === 0}><summary><span className="event-number">{String(eventIndex + 1).padStart(2, '0')}</span><span className={`event-role ${event.role}`}>{event.role}</span><span className="event-name">{event.name || event.type || 'Message'}</span><span className="event-preview">{content.replace(/\s+/g, ' ').slice(0, 90)}</span><Icon name="down" size={14}/></summary><EventContent content={content}/></details>})}</div>{!events.length && <div className="empty-state"><p>No events match this search.</p></div>}{events.length > visible && <button className="button secondary load-events" onClick={() => setVisible(visible + 30)}>Show next {Math.min(30, events.length - visible)} events <Icon name="down" size={15}/></button>}<p className="trajectory-footnote">Historical logs are displayed as escaped text. They may contain untrusted repository content or model-generated commands; no content is executed by this website.</p></>}
  </div>
}

function EventContent({ content }: { content: string }) {
  const [limit, setLimit] = useState(12000)
  return <div className="event-content"><pre>{content.slice(0, limit)}</pre>{content.length > limit && <button className="text-link" onClick={() => setLimit(limit + 24000)}>Show more of this event ({(content.length - limit).toLocaleString()} characters remaining) <Icon name="down" size={13}/></button>}</div>
}
