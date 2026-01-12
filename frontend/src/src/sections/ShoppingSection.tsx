import { useState } from 'react'
import type { ShoppingList } from '../api/types'
import { useUIStore } from '../store/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { ChevronDown, ShoppingCart } from 'lucide-react'

type ShoppingSectionProps = {
  shoppingLists: ShoppingList[]
  getProgress: (list: ShoppingList) => { ratio: number; total: number; checked: number }
  onToggleComplete: (id: number, isCompleted: boolean) => void
}

type PendingToggle = {
  id: number
  isCompleted: boolean
  title: string
} | null

export function ShoppingSection({ shoppingLists, getProgress, onToggleComplete }: ShoppingSectionProps) {
  const { openShoppingListModal, openCreateShoppingListModal } = useUIStore()
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<PendingToggle>(null)

  const handleToggleClick = (list: ShoppingList) => {
    setPendingToggle({
      id: list.id,
      isCompleted: list.is_completed ?? false,
      title: list.title || `Lista #${list.id}`
    })
  }

  const handleConfirmToggle = () => {
    if (pendingToggle) {
      onToggleComplete(pendingToggle.id, pendingToggle.isCompleted)
      setPendingToggle(null)
    }
  }

  const handleCancelToggle = () => {
    setPendingToggle(null)
  }

  const activeLists = shoppingLists.filter(list => !list.is_completed)
  const completedLists = shoppingLists.filter(list => list.is_completed)

  const getAnimalsDietsInfo = (list: ShoppingList) => {
    // Grupowanie diet według zwierząt
    const animalMap = new Map<string, Array<{ id: number; start_date: string; end_date: string | null }>>()
    
    if (!list.diets_info || !Array.isArray(list.diets_info)) {
      return animalMap
    }
    
    list.diets_info.forEach((dietInfo) => {
      const animalName = dietInfo.animal_name || 'Nieznane'
      const existingDiets = animalMap.get(animalName) || []
      existingDiets.push({
        id: dietInfo.id || 0,
        start_date: dietInfo.start_date || '',
        end_date: dietInfo.end_date || null
      })
      animalMap.set(animalName, existingDiets)
    })
    
    return animalMap
  }

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    if (!endDate) return `od ${start}`
    const end = new Date(endDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    return `${start} - ${end}`
  }

  const renderListCard = (list: ShoppingList) => {
    const { ratio, total, checked } = getProgress(list)
    const animalsDiets = getAnimalsDietsInfo(list)

    return (
      <Card key={list.id}>
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div>
            <CardTitle className="text-lg">{list.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {list.days_count} dni • {total} pozycji • {checked}/{total} kupione
            </p>
          </div>
          <Badge variant={list.is_completed ? 'secondary' : 'default'}>
            {list.is_completed ? 'Ukończona' : 'Aktywna'}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {animalsDiets.size > 0 && (
            <div className="space-y-2 pb-2">
              {Array.from(animalsDiets.entries()).map(([animalName, diets]) => (
                <div key={animalName} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{animalName}:</p>
                  <p className="text-xs text-muted-foreground">
                    {diets.map((diet, idx) => (
                      <span key={diet.id}>
                        {formatDateRange(diet.start_date, diet.end_date)}
                        {idx < diets.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Postęp</span>
              <span className="font-medium">{Math.round(ratio * 100)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden" aria-label="Postęp listy">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => openShoppingListModal(list.id)}
            >
              Otwórz
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleToggleClick(list)}
            >
              {list.is_completed ? 'Przywróć' : 'Ukończ'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <section id="zakupy" className="space-y-6">
      <SectionHeader
        eyebrow="Checklisty zakupów"
        title="Postęp i status"
        actions={
          <Button onClick={openCreateShoppingListModal} className="sm:w-auto">
            Nowa lista zakupów
          </Button>
        }
      />

      {activeLists.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold mb-4">Aktywne ({activeLists.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeLists.map(renderListCard)}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<ShoppingCart className="h-16 w-16" />}
          description={
            shoppingLists.length === 0
              ? "Brak list zakupów. Utwórz pierwszą listę!"
              : "Wszystkie listy zostały ukończone. Utwórz nową listę!"
          }
          action={<Button onClick={openCreateShoppingListModal}>Nowa lista zakupów</Button>}
        />
      )}

      {completedLists.length > 0 && (
        <div>
          <button
            onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
            aria-expanded={isCompletedExpanded}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <h3 className="text-lg font-semibold">Ukończone ({completedLists.length})</h3>
            <ChevronDown
              className="h-5 w-5 transition-transform duration-300"
              style={{ transform: isCompletedExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
          {isCompletedExpanded && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              {completedLists.map(renderListCard)}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!pendingToggle} onOpenChange={() => setPendingToggle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingToggle?.isCompleted
                ? 'Przywrócić listę do aktywnych?'
                : 'Oznaczyć listę jako ukończoną?'}
            </DialogTitle>
            <DialogDescription>
              {pendingToggle?.isCompleted
                ? `Czy na pewno chcesz przywrócić listę "${pendingToggle?.title}" do aktywnych?`
                : `Czy na pewno chcesz oznaczyć listę "${pendingToggle?.title}" jako ukończoną?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelToggle}>
              Anuluj
            </Button>
            <Button onClick={handleConfirmToggle}>
              {pendingToggle?.isCompleted ? 'Przywróć' : 'Ukończ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
