import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Annotation, Task } from './types'
import { Icon } from './icons'

interface Line { text: string; old: number | null; next: number | null; kind: 'add' | 'delete' | 'context' | 'hunk' | 'meta' }
interface Token { content: string; color?: string; fontStyle?: number }
const PAGE_SIZE = 180
const excerptCount = (value: number | unknown[] | undefined) => Array.isArray(value) ? value.length : value ?? 0
function diffLines(diff: string): Line[] {
  let oldLine = 0; let newLine = 0; let inHunk = false
  return diff.split('\n').map(text => {
    const match = text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (match) { oldLine = Number(match[1]); newLine = Number(match[2]); inHunk = true; return { text, old: null, next: null, kind: 'hunk' } }
    if (!inHunk || text.startsWith('\\')) return { text, old: null, next: null, kind: 'meta' }
    if (text.startsWith('+')) return { text: text.slice(1), old: null, next: newLine++, kind: 'add' }
    if (text.startsWith('-')) return { text: text.slice(1), old: oldLine++, next: null, kind: 'delete' }
    if (text.startsWith(' ')) return { text: text.slice(1), old: oldLine++, next: newLine++, kind: 'context' }
    return { text, old: null, next: null, kind: 'meta' }
  })
}

function language(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || ''
  return ({ c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', cxx: 'cpp', hpp: 'cpp', rs: 'rust', py: 'python', js: 'javascript', mjs: 'javascript', ts: 'typescript', tsx: 'tsx', jsx: 'jsx', json: 'json', sh: 'shellscript', bash: 'shellscript', yaml: 'yaml', yml: 'yaml', md: 'markdown', html: 'html', xml: 'xml', sql: 'sql', java: 'java', go: 'go', css: 'css', toml: 'toml', wat: 'wasm' } as Record<string, string>)[extension] || (/Makefile/.test(path) ? 'makefile' : 'text')
}

export function CodeViewer({ task, isBuggy }: { task: Task; isBuggy: boolean }) {
  const [fileIndex, setFileIndex] = useState(() => { const index = task.files.findIndex(file => file.annotations?.length); return index < 0 ? 0 : index })
  const [view, setView] = useState<'diff' | 'source'>(() => task.files[fileIndex]?.referenceOnly || !task.files[fileIndex]?.diff ? 'source' : 'diff')
  const [page, setPage] = useState(0)
  const [pendingLine, setPendingLine] = useState<number>()
  const [dark, setDark] = useState(true)
  const [tokens, setTokens] = useState<Token[][]>([])
  const [highlightError, setHighlightError] = useState(false)
  const [popover, setPopover] = useState<{ annotations: Annotation[]; line: number; top?: number; bottom?: number; left: number; maxHeight: number }>()
  const [pinned, setPinned] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const codeRef = useRef<HTMLDivElement>(null)
  const file = task.files[fileIndex]
  const annotations = isBuggy ? file?.annotations || [] : []
  const rows = useMemo<Line[]>(() => !file ? [] : view === 'source' ? (file.content || '').split('\n').map((text, index) => ({ text, old: null, next: index + 1, kind: 'context' })) : diffLines(file.diff || ''), [file, view])
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const visibleCode = visible.map(row => row.text).join('\n')
  useEffect(() => {
    let active = true; setTokens([]); setHighlightError(false)
    import('shiki/bundle/web').then(async ({ codeToTokens }) => {
      const result = await codeToTokens(visibleCode, { lang: language(file?.path || '') as Parameters<typeof codeToTokens>[1]['lang'], theme: dark ? 'github-dark' : 'github-light' })
      if (active) setTokens(result.tokens)
    }).catch(() => { if (active) setHighlightError(true) })
    return () => { active = false }
  }, [visibleCode, file?.path, dark])
  useEffect(() => { setPopover(undefined); setPinned(false) }, [fileIndex, view])
  useLayoutEffect(() => {
    if (pendingLine == null) return
    const target = codeRef.current?.querySelector(`[data-line="${pendingLine}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'center' })
      setPendingLine(undefined)
    }
  }, [fileIndex, view, page, pendingLine])
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPopover(undefined); setPinned(false) } }; document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape) }, [])
  useEffect(() => { const close = () => { setPopover(undefined); setPinned(false) }; window.addEventListener('resize', close); return () => window.removeEventListener('resize', close) }, [])
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])
  function showAnnotation(annotations: Annotation[], line: number, element: HTMLElement, pin = false) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (pinned && !pin) return
    const rect = element.getBoundingClientRect()
    const below = Math.max(0, window.innerHeight - rect.bottom - 20)
    const above = Math.max(0, rect.top - 20)
    const placeBelow = below >= 320 || below >= above
    setPopover({
      annotations, line,
      top: placeBelow ? rect.bottom + 8 : undefined,
      bottom: placeBelow ? undefined : window.innerHeight - rect.top + 8,
      left: Math.max(12, Math.min(rect.left + 70, window.innerWidth - Math.min(560, window.innerWidth - 24) - 12)),
      maxHeight: Math.min(480, placeBelow ? below : above),
    })
    if (pin) setPinned(true)
  }
  function hideAnnotation() { if (!pinned) hideTimer.current = setTimeout(() => setPopover(undefined), 250) }
  function jumpToBug() {
    const targetIndex = task.files.findIndex(item => item.annotations?.length)
    if (targetIndex < 0) return
    const target = file.annotations?.length ? fileIndex : targetIndex
    const line = task.files[target].annotations[0].startLine
    setFileIndex(target); setView('source'); setPage(Math.floor((line - 1) / PAGE_SIZE))
    setPopover(undefined); setPinned(false); setPendingLine(line)
  }
  if (!file) return <div className="empty-state">No source files are available for this task.</div>
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const mapped = annotations.filter(annotation => annotation.mapping === 'validated').length
  return <div className={`code-viewer ${dark ? 'code-dark' : 'code-light'}`}>
    <div className="file-tabs" aria-label="Commit files">{task.files.map((item, index) => <button key={`${item.path}-${index}`} className={fileIndex === index ? 'active' : ''} onClick={() => { setFileIndex(index); setPage(0); setPendingLine(undefined); if (item.referenceOnly || !item.diff) setView('source') }} aria-pressed={fileIndex === index}><Icon name="file" size={14} /><span>{item.path}</span>{isBuggy && item.annotations?.length > 0 && <span className="file-bug-dot" title="Ground truth annotation" />}</button>)}</div>
    <div className="code-toolbar"><div className="code-file-meta"><span>{file.referenceOnly ? 'Context file' : file.status || 'modified'}</span><span className="additions">+{file.additions}</span><span className="deletions">−{file.deletions}</span></div><div className="code-tools">{isBuggy && task.files.some(item => item.annotations?.length) && <button className="jump-button" onClick={jumpToBug}><span className="file-bug-dot" /> Jump to bug</button>}<div className="code-segmented"><button className={view === 'diff' ? 'active' : ''} aria-pressed={view === 'diff'} onClick={() => { setView('diff'); setPage(0); setPendingLine(undefined) }} disabled={!file.diff}>Diff</button><button className={view === 'source' ? 'active' : ''} aria-pressed={view === 'source'} onClick={() => { setView('source'); setPage(0); setPendingLine(undefined) }} disabled={file.content == null}>Source</button></div><button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Use light code theme' : 'Use dark code theme'}><Icon name={dark ? 'sun' : 'moon'} size={16} /></button></div></div>
    {annotations.length > 0 && <div className="code-annotation-note"><span className="file-bug-dot" /><span>{annotations.length} ground-truth {annotations.length === 1 ? 'location' : 'locations'} · {mapped === annotations.length ? 'Highlighted coordinates validated against this snapshot' : `${mapped} validated; other locations use unverified recorded coordinates`}.{annotations.some(annotation => annotation.excerptMapping) ? ' Excerpts may omit or leave unmatched lines; highlights show anchored spans only.' : ''} Hover, focus, or tap a red line.</span></div>}
    {(view === 'source' && file.content == null) || (view === 'diff' && !file.diff) ? <div className="code-unavailable"><Icon name="info" />{file.contentUnavailableReason || 'This file is context for the finding; no commit diff is available. Select Source to inspect the saved content.'}</div> : <div className="code-scroll" ref={codeRef} aria-label={`${view === 'diff' ? 'Commit diff' : 'Source code'}: ${file.path}`}><div className="code-lines">{visible.map((row, index) => {
      const lineAnnotations = row.next == null ? [] : annotations.filter(item => row.next! >= item.startLine && row.next! <= item.endLine)
      return <div key={page * PAGE_SIZE + index} className={`code-line ${row.kind} ${lineAnnotations.length ? 'bug-line' : ''}`} data-testid="code-line" data-line={row.next ?? undefined} onMouseEnter={event => { if (lineAnnotations.length && row.next) showAnnotation(lineAnnotations, row.next, event.currentTarget) }} onMouseLeave={hideAnnotation}>
        {view === 'diff' && <span className="line-number old-number" aria-hidden="true">{row.old}</span>}<span className="line-number" aria-hidden="true">{row.next}</span><span className="line-sign" aria-hidden="true">{row.kind === 'add' ? '+' : row.kind === 'delete' ? '−' : ''}</span>{lineAnnotations.length ? <button className="bug-line-marker" aria-label={`Ground truth at line ${row.next}`} onFocus={event => showAnnotation(lineAnnotations, row.next!, event.currentTarget)} onClick={event => showAnnotation(lineAnnotations, row.next!, event.currentTarget, true)} onBlur={hideAnnotation}><span /></button> : <span className="bug-marker-space" />}<code>{tokens[index]?.map((token, tokenIndex) => <span key={tokenIndex} style={{ color: token.color, fontStyle: token.fontStyle === 1 ? 'italic' : undefined }}>{token.content}</span>) || row.text || ' '}</code>
      </div>
    })}</div></div>}
    <div className="code-pagination"><span>{rows.length ? `${page * PAGE_SIZE + 1}–${Math.min(rows.length, (page + 1) * PAGE_SIZE)} of ${rows.length.toLocaleString()} ${view === 'diff' ? 'diff rows' : 'lines'}` : 'No lines'}{highlightError ? ' · Plain-text fallback' : ' · Shiki syntax highlighting'}</span><div><button onClick={() => { setPage(page - 1); setPopover(undefined) }} disabled={page === 0}>Previous</button><span>{page + 1} / {totalPages}</span><button onClick={() => { setPage(page + 1); setPopover(undefined) }} disabled={page + 1 >= totalPages}>Next</button></div></div>
    {popover && createPortal(<aside className="ground-truth-popover" data-testid="ground-truth-popover" role="dialog" aria-label={`Ground truth at line ${popover.line}`} style={{ top: popover.top, bottom: popover.bottom, left: popover.left, maxHeight: popover.maxHeight }} onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current) }} onMouseLeave={hideAnnotation}><div className="popover-header"><span><span className="file-bug-dot" /> GROUND TRUTH · LINE {popover.line}{popover.annotations.length > 1 ? ` · ${popover.annotations.length} FINDINGS` : ''}</span><button className="icon-button" aria-label="Close ground truth" onClick={() => { setPopover(undefined); setPinned(false) }}><Icon name="close" size={15} /></button></div>{popover.annotations.map((annotation, annotationIndex) => <div className="popover-body" key={annotationIndex}><h3>{annotation.title}</h3><div className="popover-tags">{annotation.severity && <span>{annotation.severity} severity</span>}{annotation.function && <code>{annotation.function}()</code>}{annotation.cweIds?.map(cwe => <span key={cwe}>{cwe}</span>)}</div><p>{annotation.message}</p>{(annotation as Annotation & { suggestion?: string }).suggestion && <><h4>Suggested correction</h4><p>{(annotation as Annotation & { suggestion?: string }).suggestion}</p></>}<div className={`mapping-note ${annotation.mapping}`}><Icon name="info" size={14}/><span>{annotation.mappingBasis || (annotation.mapping === 'validated' ? 'Highlighted coordinates validated against the pinned source revision.' : 'Recorded line coordinates; this mapping has not been validated against the displayed source.')}{annotation.excerptMapping && <><br/>Only anchored spans are highlighted. The recorded excerpt has {excerptCount(annotation.excerptMapping.unmatchedCodeLines)} unmatched code lines and {excerptCount(annotation.excerptMapping.omissionLines)} omission lines.</>}</span></div>{annotation.originalSnippet && annotation.excerptMapping && <details className="criteria-details"><summary>Original recorded excerpt <Icon name="down" size={13}/></summary><pre>{annotation.originalSnippet}</pre></details>}</div>)}</aside>, document.body)}
  </div>
}
