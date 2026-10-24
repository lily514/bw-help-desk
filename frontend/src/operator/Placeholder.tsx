/** Stand-in for screens built in later phases. */
export function Placeholder({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="operator-page">
      <div className="empty-card">
        <p>
          {title} arrives in Phase {phase}.
        </p>
      </div>
    </div>
  )
}
