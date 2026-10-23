const MARKER_START = '[['
const CITE_MARKER = /\[\[\s*cite\s*:([^\]]*)\]\]/i

/**
 * Splits a streamed answer into parent-visible text and the trailing
 * `[[cite: id1, id2]]` marker (PLAN.md 3.1). Text is forwarded as it arrives,
 * except anything from `[[` onward, which is held back until the stream ends.
 * A lone trailing `[` is also held, since the next delta may complete `[[`.
 */
export class CitationStream {
  private held = ''
  private inMarker = false
  private emitted = ''

  constructor(private readonly validIds: ReadonlySet<string>) {}

  /** Feed one delta; returns the text that is safe to show now. */
  push(delta: string): string {
    if (this.inMarker) {
      this.held += delta
      return ''
    }

    const buffer = this.held + delta
    const markerAt = buffer.indexOf(MARKER_START)
    let out: string
    if (markerAt >= 0) {
      this.inMarker = true
      out = buffer.slice(0, markerAt)
      this.held = buffer.slice(markerAt)
    } else if (buffer.endsWith('[')) {
      out = buffer.slice(0, -1)
      this.held = '['
    } else {
      out = buffer
      this.held = ''
    }

    this.emitted += out
    return out
  }

  /**
   * Call once the stream ends. `tail` is any held text that turned out not to be
   * a cite marker (show it too); `text` is the full cleaned answer to save.
   */
  finish(): { tail: string; text: string; citations: string[] } {
    const match = CITE_MARKER.exec(this.held)
    const tail = match ? '' : this.held
    const citations = match ? this.parseIds(match[1]) : []
    this.emitted += tail
    return { tail, text: this.emitted.trim(), citations }
  }

  private parseIds(list: string): string[] {
    const ids = list
      .split(',')
      .map((id) => id.trim())
      .filter((id) => this.validIds.has(id))
    return [...new Set(ids)]
  }
}
