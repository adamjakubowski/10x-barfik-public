import { useState } from 'react'
import type { AnimalDetail, Diet } from '../api/types'
import { useUIStore } from '../store/uiStore'
import { useDeleteAnimal } from '../hooks/useAnimals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/components/ui/section-header'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PawPrint } from 'lucide-react'

type AnimalsSectionProps = {
  animals: AnimalDetail[]
  diets: Diet[]
}

type DeleteConfirmation = {
  animalId: number
  animalName: string
} | null

export function AnimalsSection({ animals, diets }: AnimalsSectionProps) {
  const { openAnimalModal, openCreateAnimalModal } = useUIStore()
  const [showDeleted, setShowDeleted] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(null)
  const deleteAnimal = useDeleteAnimal()

  // Filtrowanie zwierząt
  const filteredAnimals = showDeleted ? animals : animals.filter(a => a.is_active)

  const handleDeleteClick = (animal: AnimalDetail) => {
    setDeleteConfirmation({
      animalId: animal.id,
      animalName: animal.name
    })
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmation) {
      try {
        await deleteAnimal.mutateAsync(deleteConfirmation.animalId)
        setDeleteConfirmation(null)
      } catch {
        // Error handled by mutation
      }
    }
  }

  return (
    <section id="zwierzeta" className="space-y-6">
      <SectionHeader
        eyebrow="Twoje zwierzęta"
        title="Karty profili"
        actions={
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-deleted-animals"
                checked={showDeleted}
                onCheckedChange={setShowDeleted}
              />
              <Label htmlFor="show-deleted-animals" className="text-sm cursor-pointer">
                Pokaż usunięte
              </Label>
            </div>
            <Button onClick={openCreateAnimalModal} data-testid="add-animal-button">Nowe zwierzę</Button>
          </>
        }
      />
      
      {filteredAnimals.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="h-16 w-16" />}
          description="Brak zwierząt. Dodaj pierwsze zwierzę!"
          action={<Button onClick={openCreateAnimalModal} data-testid="add-animal-button-on-empty">Nowe zwierzę</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAnimals.map((animal) => {
          const activeDietCount = diets.filter((diet) => diet.animal === animal.id && diet.is_active).length
          const weightLabel = animal.weight_kg ? `${Number(animal.weight_kg).toFixed(1)} kg` : '—'
          const lastUpdated = new Date(animal.updated_at).toLocaleDateString('pl-PL')
          const speciesLabel = `${animal.species.name}`

          return (
            <Card key={animal.id} className={!animal.is_active ? 'opacity-60' : ''} data-testid={`animal-card-${animal.name}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{animal.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{speciesLabel}</p>
                  </div>
                  <Badge variant="secondary">{weightLabel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Aktywne diety: {activeDietCount}</p>
                  <p className="text-sm text-muted-foreground">Ostatnia aktualizacja: {lastUpdated}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAnimalModal(animal.id)}
                    className="flex-1"
                    data-testid={`animal-diets-button-${animal.name}`}
                  >
                    Szczegóły
                  </Button>
                  {animal.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(animal)}
                      className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Usuń
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      <Dialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz usunąć zwierzę?</DialogTitle>
            <DialogDescription>
              <strong>{deleteConfirmation?.animalName}</strong>
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Operacja jest nieodwracalna. Usunięte zwierzę nie będzie dostępne przy tworzeniu nowych diet.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
