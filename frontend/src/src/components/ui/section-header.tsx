import { type ReactNode } from 'react'

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function SectionHeader({ eyebrow, title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
