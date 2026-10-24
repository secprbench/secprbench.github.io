import type { Detection, Model } from './types'
import { modelColor } from './data'
import { Icon } from './icons'

export function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <div className={`notice ${error ? 'error' : ''}`}><Icon name="info" /><div>{children}</div></div>
}

export function Loading({ text = 'Loading benchmark data…' }: { text?: string }) {
  return <div className="loading" role="status"><span className="spinner" />{text}</div>
}

export function ModelMark({ model, small = false }: { model: Model; small?: boolean }) {
  return <span className={`model-mark ${small ? 'small' : ''}`} style={{ '--model-color': modelColor(model) } as React.CSSProperties}>{model.shortLabel?.slice(0, 2) || model.label.slice(0, 2)}</span>
}

export const detectionLabels: Record<Detection, string> = { detected: 'Target detected', missed: 'Target not detected', missing: 'Review missing', unjudged: 'Review not judged' }
const abbreviation: Record<string, string> = { codex: 'CX', defending: 'AH', opus: 'O5', sonnet: 'S5', grok: 'GR', glm: 'GL', gpt: '5S', gpt6sol: '6S', luna: '6L', minimax: 'MM' }

export function DetectionBadge({ model, status }: { model: Model; status: Detection }) {
  const shortName = abbreviation[model.id] || model.shortLabel || model.id
  return <span className={`detection-badge ${status || 'missing'}`} data-testid="model-detection" tabIndex={0} aria-label={`${model.label}: ${detectionLabels[status] || 'Review missing'}`}><span className="detection-initial">{shortName}</span><Icon name={status === 'detected' ? 'check' : status === 'missed' ? 'close' : 'dash'} size={12} /><span role="tooltip" className="badge-tooltip"><strong>{model.label}</strong>{detectionLabels[status] || 'Review missing'}</span></span>
}
