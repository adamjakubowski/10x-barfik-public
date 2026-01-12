import { useState, type FormEvent } from 'react'
import type { AnimalType } from '../api/types'
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

type NewAnimalModalProps = {
  animalTypes: AnimalType[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    species_id: number
    name: string
    date_of_birth?: string | null
    weight_kg?: string | null
    note?: string
  }) => Promise<void>
}

export function NewAnimalModal({ animalTypes, open, onOpenChange, onSave }: NewAnimalModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    species_id: animalTypes[0]?.id || 0,
    name: '',
    date_of_birth: '',
    weight_kg: '',
    note: '',
  })
  const [errors, setErrors] = useState<{
    name?: string
    species_id?: string
    weight_kg?: string
  }>({})

  const validate = () => {
    const newErrors: typeof errors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Imię jest wymagane'
    }

    if (!formData.species_id) {
      newErrors.species_id = 'Gatunek jest wymagany'
    }

    if (formData.weight_kg && isNaN(Number(formData.weight_kg))) {
      newErrors.weight_kg = 'Waga musi być liczbą'
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
        species_id: formData.species_id,
        name: formData.name.trim(),
        date_of_birth: formData.date_of_birth || null,
        weight_kg: formData.weight_kg || null,
        note: formData.note.trim() || '',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="animal-modal">
        <DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground">Nowe zwierzę</p>
            <DialogTitle>Dodaj zwierzę</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Imię *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. Rex"
                required
                autoFocus
                data-testid="animal-name-input"
              />
              {errors.name && <span className="text-sm text-destructive">{errors.name}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="species">Gatunek *</Label>
              <Select
                value={String(formData.species_id)}
                onValueChange={(value) => setFormData({ ...formData, species_id: Number(value) })}
              >
                <SelectTrigger id="species" data-testid="animal-species-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animalTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)} data-testid={`species-option-${type.id}`}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.species_id && <span className="text-sm text-destructive">{errors.species_id}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Data urodzenia</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                data-testid="animal-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_kg">Waga (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.1"
                min="0"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="np. 25.5"
                data-testid="animal-weight-input"
              />
              {errors.weight_kg && <span className="text-sm text-destructive">{errors.weight_kg}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notatka</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={4}
              placeholder="Dodatkowe informacje o zwierzęciu..."
              data-testid="animal-note-input"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving} data-testid="animal-modal-close">
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="animal-submit-button">
              {isSaving ? 'Dodawanie...' : 'Dodaj zwierzę'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
