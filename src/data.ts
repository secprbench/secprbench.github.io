export function assetUrl(path: string): string {
  return new URL(path.replace(/^\/+/, ''), new URL(import.meta.env.BASE_URL, window.location.href)).href
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(assetUrl(path))
  if (!response.ok) throw new Error(`Could not load this artifact (${response.status}). Please try again.`)
  if (path.endsWith('.gz')) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    // Content-Encoding can cause the browser to decompress before JavaScript sees the body.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack compressed artifacts. Please use a recent browser or download the artifact.')
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()) as T
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  }
  return response.json() as Promise<T>
}

export const BENCHMARK_REPO = 'https://github.com/secprbench/secprbench'

export const percent = (value: number) => `${(value * 100).toFixed(1)}%`
export const number = (value: number) => value.toLocaleString('en-US')
export function readable(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  return JSON.stringify(value, null, 2)
}

// Model identity colors re-stepped for the dark surface (same hues as the data's light colors, lighter and slightly more saturated).
const darkModelColors: Record<string, string> = { defending: '#b57fc0', grok: '#8a9eab', gpt6sol: '#2fb09a', glm: '#7f92f2', opus: '#dd7b5a', sonnet: '#c98c4f', gpt: '#3fae8c', luna: '#49b0a0', codex: '#88a3a3', minimax: '#e86a97' }
export const modelColor = (model: { id: string; color?: string }) => darkModelColors[model.id] || model.color || '#4fd1dc'
export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
