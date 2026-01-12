import { useState, type FormEvent } from 'react'
import type { AnimalDetail } from '../api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type NewDietModalProps = {
  animals: AnimalDetail[]
  preselectedAnimalId?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: {
    animal_id: number
    start_date: string
    end_date?: string | null
    description?: string
  }) => Promise<void>
}

const today = new Date().toISOString().slice(0, 10)

export function NewDietModal({
  animals,
  preselectedAnimalId,
  open,
  onOpenChange,
  onSave
}: NewDietModalProps) {
  const defaultAnimalId = preselectedAnimalId ?? animals[0]?.id ?? 0
  const [animalId, setAnimalId] = useState<number>(defaultAnimalId)
  const [startDate, setStartDate] = useState<string>(today)
  const [endDate, setEndDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{
    animalId?: string
    startDate?: string
    endDate?: string
  }>({})

  const validate = () => {
    const newErrors: typeof errors = {}

    if (!animalId) {
      newErrors.animalId = 'Zwierzę jest wymagane'
    }

    if (!startDate) {
      newErrors.startDate = 'Data startu jest wymagana'
    }

    // Walidacja porównania dat
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'Data zakończenia nie może być wcześniejsza niż data startu'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSaving(true)
    try {
      await onSave({
        animal_id: animalId,
        start_date: startDate,
        end_date: endDate || null,
        description: description || '',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="diet-modal">
        <DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground">Dieta</p>
            <DialogTitle>Nowa dieta</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="animal">Zwierzę *</Label>
              <Select
                value={String(animalId)}
                onValueChange={(value) => setAnimalId(Number(value))}
                disabled={isSaving}
              >
                <SelectTrigger id="animal" data-testid="diet-animal-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={String(animal.id)} data-testid={`animal-option-${animal.id}`}>
                      {animal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.animalId && <span className="text-sm text-destructive">{errors.animalId}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data startu *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={isSaving}
                data-testid="diet-start-date-input"
              />
              {errors.startDate && <span className="text-sm text-destructive">{errors.startDate}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data zakończenia</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSaving}
                data-testid="diet-end-date-input"
              />
              {errors.endDate && <span className="text-sm text-destructive">{errors.endDate}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Opcjonalny opis diety..."
              disabled={isSaving}
              data-testid="diet-description-input"
            />
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              Po utworzeniu diety będziesz mógł dodać składniki i dostosować skład dziennej porcji.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              data-testid="diet-modal-close"
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="diet-submit-button">
              {isSaving ? 'Tworzenie...' : 'Utwórz'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
