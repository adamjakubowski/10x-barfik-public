import { Card, CardContent } from '@/components/ui/card'
import { type ReactNode } from 'react'

type EmptyStateProps = {
  icon?: ReactNode
  title?: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        {icon && <div className="text-muted-foreground opacity-50">{icon}</div>}
        {title && <h3 className="text-xl font-semibold">{title}</h3>}
        <p className="text-muted-foreground max-w-sm">{description}</p>
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  )
}
