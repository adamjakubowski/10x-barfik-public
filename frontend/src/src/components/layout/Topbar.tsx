type TopbarProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ eyebrow, title, subtitle, actions }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="top-actions">{actions}</div> : null}
    </header>
  )
}
