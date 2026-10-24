/**
 * Just enough Markdown for knowledge-base bodies: paragraphs, `- ` lists
 * (nested by two-space indents) and `|` tables. Anything else is plain text.
 */

export interface ListItem {
  text: string
  children: ListItem[]
}

export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: ListItem[] }
  | { type: 'table'; header: string[]; rows: string[][] }

const LIST_ITEM = /^(\s*)[-*] (.*)$/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_DIVIDER = /^\s*\|(\s*:?-+:?\s*\|)+\s*$/

function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    if (!line.trim()) {
      i++
      continue
    }

    if (TABLE_ROW.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && TABLE_ROW.test(lines[i]!)) {
        if (!TABLE_DIVIDER.test(lines[i]!)) rows.push(cells(lines[i]!))
        i++
      }
      const [header = [], ...body] = rows
      blocks.push({ type: 'table', header, rows: body })
      continue
    }

    if (LIST_ITEM.test(line)) {
      const root: ListItem[] = []
      // Stack of [indent, items-at-that-level].
      const stack: [number, ListItem[]][] = [[-1, root]]
      while (i < lines.length && LIST_ITEM.test(lines[i]!)) {
        const [, indent, text] = LIST_ITEM.exec(lines[i]!)!
        const depth = indent!.length
        while (stack.length > 1 && stack[stack.length - 1]![0] >= depth) stack.pop()
        const siblings = stack[stack.length - 1]![1]
        const item: ListItem = { text: text!, children: [] }
        siblings.push(item)
        stack.push([depth, item.children])
        i++
      }
      blocks.push({ type: 'list', items: root })
      continue
    }

    const paragraph: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !LIST_ITEM.test(lines[i]!) &&
      !TABLE_ROW.test(lines[i]!)
    ) {
      paragraph.push(lines[i]!.trim())
      i++
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
  }

  return blocks
}
