import { useMemo } from 'react'
import { parseBlocks, type ListItem } from './markdownBlocks'

function List({ items }: { items: ListItem[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          {item.text}
          {item.children.length > 0 && <List items={item.children} />}
        </li>
      ))}
    </ul>
  )
}

/** Renders a knowledge-base body. Text only; no HTML passes through. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text])
  return (
    <div className={['md', className].filter(Boolean).join(' ')}>
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') return <p key={i}>{block.text}</p>
        if (block.type === 'list') return <List key={i} items={block.items} />
        return (
          <div key={i} className="md-table">
            <table>
              <thead>
                <tr>
                  {block.header.map((h, j) => (
                    <th key={j}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
