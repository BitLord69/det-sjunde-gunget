/**
 * LRC (LyRiCs) Utility for Det 7:e Gunget
 * Standard timestamped lyrics parsing, formatting and helpers.
 */

export interface ParsedLrcLine {
  id: number
  raw: string
  text: string
  time?: number // in seconds, e.g. 18.5
  isHeader?: boolean // [Vers 1], [Refräng], [Intro]
  isSolo?: boolean // [Solo], (Gitarrsolo), (Munspelssolo)
}

export interface ParsedLrcResult {
  lines: ParsedLrcLine[]
  hasTimestamps: boolean
  firstTimestamp?: number
  lastTimestamp?: number
}

/**
 * Parses a string containing lyrics into structured lines.
 * Supports standard LRC formats:
 * - [mm:ss.xx]
 * - [mm:ss.xxx]
 * - [mm:ss]
 * - [m:ss]
 * And section headers like [Vers 1], [Refräng], [Stick]
 */
export function parseLrc(content: string | null | undefined): ParsedLrcResult {
  if (!content || !content.trim()) {
    return { lines: [], hasTimestamps: false }
  }

  const rawLines = content.split('\n')
  const lines: ParsedLrcLine[] = []
  let foundTimestamp = false
  let firstTimestamp: number | undefined
  let lastTimestamp: number | undefined

  // Robust Regex matching [mm:ss], [m:ss], [m:s], [mm:ss.xx], [mm:ss,xx], [ 0:00 ] etc.
  const timeRegex = /^\[\s*(\d{1,2})\s*:\s*(\d{1,2})(?:[\.,:](\d{1,3}))?\s*\]\s*(.*)$/
  // Regex matching section headers: [Vers 1], [Refräng], [Intro], etc.
  const headerRegex = /^\[([A-Za-zÅÄÖåäö0-9\s:-]+)\]$/

  rawLines.forEach((raw, idx) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      lines.push({ id: idx, raw, text: '' })
      return
    }

    const timeMatch = trimmed.match(timeRegex)
    if (timeMatch) {
      foundTimestamp = true
      const mins = parseInt(timeMatch[1] || '0', 10)
      const secs = parseInt(timeMatch[2] || '0', 10)
      const ms = timeMatch[3] ? parseFloat(`0.${timeMatch[3]}`) : 0
      const totalSecs = mins * 60 + secs + ms
      // Ensure any additional or nested timestamp prefixes are stripped from lyric text
      let lyricText = (timeMatch[4] || '').trim()
      lyricText = lyricText.replace(/^\s*(?:\[\s*\d{1,2}\s*:\s*\d{1,2}(?:[\.,:]\d{1,3})?\s*\]\s*)+/, '')

      if (firstTimestamp === undefined || totalSecs < firstTimestamp) {
        firstTimestamp = totalSecs
      }
      if (lastTimestamp === undefined || totalSecs > lastTimestamp) {
        lastTimestamp = totalSecs
      }

      const lower = lyricText.toLowerCase()
      const isSolo =
        lower.includes('solo') ||
        lower.includes('instrumental') ||
        lower.includes('paus') ||
        (lyricText.startsWith('(') && lyricText.endsWith(')'))

      const isHeader =
        (lyricText.startsWith('[') && lyricText.endsWith(']')) ||
        headerRegex.test(lyricText)

      lines.push({
        id: idx,
        raw,
        text: lyricText,
        time: totalSecs,
        isSolo,
        isHeader,
      })
      return
    }

    const headerMatch = trimmed.match(headerRegex)
    if (headerMatch) {
      lines.push({
        id: idx,
        raw,
        text: headerMatch[1] ? `[${headerMatch[1]}]` : trimmed,
        isHeader: true,
      })
      return
    }

    // Fallback: strip any accidental timestamp prefix so raw numbers never leak to UI
    const cleanFallback = trimmed.replace(/^\s*(?:\[\s*\d{1,2}\s*:\s*\d{1,2}(?:[\.,:]\d{1,3})?\s*\]\s*)+/, '')
    lines.push({
      id: idx,
      raw,
      text: cleanFallback,
    })
  })

  return {
    lines,
    hasTimestamps: foundTimestamp,
    firstTimestamp,
    lastTimestamp,
  }
}

/**
 * Removes [mm:ss], [m:ss], [mm:ss.xx], [hh:mm:ss] and bare timestamps from text lines for clean reading
 */
export function stripLrcTimestamps(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .split('\n')
    .map((l) =>
      l
        .replace(/\[\s*(?:\d{1,2}\s*:\s*)?\d{1,2}\s*:\s*\d{1,2}(?:[\.,:]\d{1,3})?\s*\]\s*/g, '')
        .replace(/^\s*(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?\s*/, '')
        .trimEnd()
    )
    .join('\n')
}

/**
 * Formats a number of seconds into mm:ss.xx for LRC export
 */
export function formatLrcTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '[00:00.00]'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const hundredths = Math.floor((seconds % 1) * 100)
  const mStr = String(mins).padStart(2, '0')
  const sStr = String(secs).padStart(2, '0')
  const hStr = String(hundredths).padStart(2, '0')
  return `[${mStr}:${sStr}.${hStr}]`
}

/**
 * Checks whether text contains standard LRC timestamps
 */
export function hasLrcFormat(text: string | null | undefined): boolean {
  if (!text) return false
  return /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(text)
}
