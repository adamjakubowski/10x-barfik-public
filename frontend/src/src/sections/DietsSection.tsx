import { useMemo, useState } from 'react'
import type { Diet } from '../api/types'
import { useUIStore } from '../store/uiStore'
import { useDeleteDiet } from '../hooks/useDiets'
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
import { UtensilsCrossed } from 'lucide-react'

type DietsSectionProps = {
  diets: Diet[]
}

type DeleteConfirmation = {
  dietId: number
  animalName: string
  dateRange: string
} | null

export function DietsSection({ diets }: DietsSectionProps) {
  const { openDietModal, openCreateDietModal } = useUIStore()
  const [showDeleted, setShowDeleted] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(null)
  const deleteDiet = useDeleteDiet()

  // Filtrowanie diet
  const filteredDiets = useMemo(() => {
    return showDeleted ? diets : diets.filter(d => d.is_active)
  }, [diets, showDeleted])

  // Group diets by animal
  const groupedDiets = useMemo(() => {
    const groups = new Map<number, { animalName: string; diets: Diet[] }>()

    filteredDiets.forEach((diet) => {
      if (!groups.has(diet.animal)) {
        groups.set(diet.animal, {
          animalName: diet.animal_name,
          diets: [],
        })
      }
      groups.get(diet.animal)!.diets.push(diet)
    })

    // Sort diets within each group: active first, then by start_date (newest first)
    groups.forEach((group) => {
      group.diets.sort((a, b) => {
        // Aktywne diety najpierw
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1
        }
        // W ramach tej samej grupy (aktywne/nieaktywne) sortuj po dacie malejąco
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      })
    })

    // Sortuj grupy alfabetycznie po nazwie zwierzęcia
    return Array.from(groups.values()).sort((a, b) => a.animalName.localeCompare(b.animalName))
  }, [filteredDiets])

  const handleDeleteClick = (diet: Diet) => {
    setDeleteConfirmation({
      dietId: diet.id,
      animalName: diet.animal_name,
      dateRange: `${diet.start_date} — ${diet.end_date || 'bezterminowa'}`
    })
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmation) {
      try {
        await deleteDiet.mutateAsync(deleteConfirmation.dietId)
        setDeleteConfirmation(null)
      } catch {
        // Error handled by mutation
      }
    }
  }

  return (
    <section id="diety" className="space-y-6">
      <SectionHeader
        eyebrow="Diety"
        title="Zakresy i sumy dzienne"
        actions={
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-deleted-diets"
                checked={showDeleted}
                onCheckedChange={setShowDeleted}
              />
              <Label htmlFor="show-deleted-diets" className="text-sm cursor-pointer">
                Pokaż usunięte
              </Label>
            </div>
            <Button onClick={() => openCreateDietModal()} data-testid="add-diet-button">Nowa dieta</Button>
          </>
        }
      />

      {filteredDiets.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-16 w-16" />}
          description="Brak diet. Utwórz pierwszą dietę!"
          action={<Button onClick={() => openCreateDietModal()} data-testid="add-diet-button-on-empty">Nowa dieta</Button>}
        />
      ) : (
        <div className="space-y-8">
          {groupedDiets.map((group, index) => (
            <div key={group.animalName} className="space-y-4">
              {index > 0 && <hr className="border-border" />}
              <div className="pb-2 border-b border-border">
                <h3 className="text-2xl font-bold text-foreground">{group.animalName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {group.diets.length} {group.diets.length === 1 ? 'dieta' : 'diet'}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.diets.map((diet) => {
                  const dateRange = `${diet.start_date} — ${diet.end_date || 'bezterminowa'}`
                  const totalLabel = `${Number(diet.total_daily_mass).toFixed(0)} g/dzień`

                  return (
                    <Card
                      key={diet.id}
                      className={!diet.is_active ? 'opacity-60' : ''}
                      data-testid="diet-card"
                      data-start={diet.start_date}
                      data-end={diet.end_date || ''}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{dateRange}</CardTitle>
                          <Badge
                            variant={diet.is_active ? 'default' : 'secondary'}
                          >
                            {diet.is_active ? 'Aktywna' : 'Usunięta'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{totalLabel}</p>
                          {diet.description && (
                            <p className="text-sm text-muted-foreground mt-2">{diet.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDietModal(diet.id)}
                            className="flex-1"
                          >
                            Szczegóły
                          </Button>
                          {diet.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(diet)}
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
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz usunąć dietę?</DialogTitle>
            <DialogDescription>
              <strong>{deleteConfirmation?.animalName}</strong>
              <br />
              {deleteConfirmation?.dateRange}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Operacja jest nieodwracalna. Usunięta dieta nie będzie dostępna przy tworzeniu nowych list zakupów.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation(null)}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Usuń dietę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

