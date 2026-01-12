import { useState, type FormEvent } from 'react'
import type { AnimalDetail, AnimalType } from '../api/types'
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
import { ShareAnimalModal } from './ShareAnimalModal'

type AnimalModalProps = {
  animal: AnimalDetail
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

export function AnimalModal({ animal, animalTypes, open, onOpenChange, onSave }: AnimalModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    species_id: animal.species.id,
    name: animal.name,
    date_of_birth: animal.date_of_birth || '',
    weight_kg: animal.weight_kg || '',
    note: animal.note || '',
  })
  const [errors, setErrors] = useState<{
    name?: string
    species_id?: string
    weight_kg?: string
  }>({})
  const [showShareModal, setShowShareModal] = useState(false)

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
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      species_id: animal.species.id,
      name: animal.name,
      date_of_birth: animal.date_of_birth || '',
      weight_kg: animal.weight_kg || '',
      note: animal.note || '',
    })
    setErrors({})
    setIsEditing(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <p className="text-sm text-muted-foreground">Zwierzę</p>
          <DialogTitle>{animal.name}</DialogTitle>
        </DialogHeader>

        {!isEditing && (
          <div className="flex justify-end gap-2 -mt-2">
            <Button variant="outline" onClick={() => setShowShareModal(true)}>
              Udostępnij
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              Edytuj
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {!isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Imię</Label>
                  <Input type="text" value={animal.name} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Gatunek</Label>
                  <Input type="text" value={animal.species.name} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Data urodzenia</Label>
                  <Input
                    type="date"
                    value={animal.date_of_birth || ''}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label>Waga (kg)</Label>
                  <Input
                    type="text"
                    value={animal.weight_kg ? `${Number(animal.weight_kg).toFixed(1)} kg` : '—'}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notatka</Label>
                <Textarea value={animal.note || ''} readOnly rows={4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Właściciel</Label>
                  <Input type="text" value={animal.owner_email} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Ostatnia aktualizacja</Label>
                  <Input
                    type="text"
                    value={new Date(animal.updated_at).toLocaleDateString('pl-PL')}
                    readOnly
                  />
                </div>
              </div>
            </>
          ) : (
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
                  />
                  {errors.name && <span className="text-sm text-destructive">{errors.name}</span>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="species">Gatunek *</Label>
                  <Select
                    value={String(formData.species_id)}
                    onValueChange={(value) => setFormData({ ...formData, species_id: Number(value) })}
                  >
                    <SelectTrigger id="species">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {animalTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
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
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>

      {showShareModal && (
        <ShareAnimalModal
          animal={animal}
          open={showShareModal}
          onOpenChange={setShowShareModal}
        />
      )}
    </Dialog>
  )
}
