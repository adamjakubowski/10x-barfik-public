import { useState, useMemo, type FormEvent } from 'react'
import type { Diet } from '../api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type NewShoppingListInput = {
  title: string
  daysCount: number
  dietIds: number[]
}

type NewShoppingListModalProps = {
  diets: Diet[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: NewShoppingListInput) => void
}

export function NewShoppingListModal({ diets, open, onOpenChange, onSave }: NewShoppingListModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState('Nowa lista zakupów')
  const [daysCount, setDaysCount] = useState(7)

  // Filtruj tylko aktywne diety
  const activeDiets = useMemo(() => diets.filter(d => d.is_active), [diets])

  const [selectedDietIds, setSelectedDietIds] = useState<Set<number>>(() => {
    const defaultId = activeDiets[0]?.id
    return defaultId ? new Set([defaultId]) : new Set()
  })

  const toggleDiet = (dietId: number) => {
    setSelectedDietIds((prev) => {
      const next = new Set(prev)
      if (next.has(dietId)) {
        next.delete(dietId)
      } else {
        next.add(dietId)
      }
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim() || 'Nowa lista zakupów'
    const dietIds = Array.from(selectedDietIds)
    const safeDays = Number.isFinite(daysCount) && daysCount > 0 ? daysCount : 1

    setIsSaving(true)
    try {
      onSave({ title: trimmedTitle, daysCount: safeDays, dietIds })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground">Lista zakupów</p>
            <DialogTitle>Nowa lista</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Przygotowanie na tydzień"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="daysCount">Liczba dni</Label>
            <Input
              id="daysCount"
              type="number"
              min={1}
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Diety do uwzględnienia</Label>
            {activeDiets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-5">
                Brak aktywnych diet. Utwórz dietę aby móc wygenerować listę zakupów.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {activeDiets.map((diet) => {
                  const checked = selectedDietIds.has(diet.id)
                  const label = `${diet.animal_name} • ${diet.start_date} — ${diet.end_date || 'otwarta'}`
                  return (
                    <label key={diet.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDiet(diet.id)}
                        aria-label={`Wybierz dietę ${label}`}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{label}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${diet.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                            {diet.is_active ? 'Aktywna' : 'Zakończona'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Dzienna porcja: {Number(diet.total_daily_mass).toFixed(0)} g</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Tworzenie...' : 'Utwórz listę'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
