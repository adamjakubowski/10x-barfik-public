import { useMemo, useState } from 'react'
import type { ShoppingList, ShoppingListItem } from '../api/types'
import { useToggleShoppingListItem, useCompleteShoppingList } from '../hooks/useShoppingLists'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type GroupedShoppingItems = Array<{ category: string; items: ShoppingListItem[] }>

type ShoppingListModalProps = {
  shoppingList: ShoppingList
  collapsedCategories: Set<string>
  onToggleCategory: (category: string) => void
  onToggleAll: () => void
  stats: { total: number; checked: number }
  getProgress: (list: ShoppingList) => { ratio: number; total: number; checked: number }
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ConfirmDialog = {
  type: 'uncheck' | 'complete-with-unchecked' | 'complete-all-checked'
  itemId?: number
  itemName?: string
} | null

export function ShoppingListModal({
  shoppingList,
  collapsedCategories,
  onToggleCategory,
  onToggleAll,
  stats,
  getProgress,
  open,
  onOpenChange,
}: ShoppingListModalProps) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null)
  const { mutate: toggleItem } = useToggleShoppingListItem(shoppingList.id)
  const { mutate: completeList } = useCompleteShoppingList(shoppingList.id)

  const handleClose = () => onOpenChange(false)

  const groupedShoppingItems = useMemo(() => {
    const map = new Map<string, ShoppingListItem[]>()
    shoppingList.items.forEach((item) => {
      const category = item.category || 'Inne'
      const bucket = map.get(category) || []
      bucket.push(item)
      map.set(category, bucket)
    })
    // Sortowanie kategorii alfabetycznie, z "Inne" na końcu
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === 'Inne') return 1
        if (b === 'Inne') return -1
        return a.localeCompare(b, 'pl')
      })
      .map(([category, items]) => ({ category, items }))
  }, [shoppingList.items])

  const progress = getProgress(shoppingList)
  const allItemsChecked = stats.total > 0 && stats.checked === stats.total

  const handleItemToggle = (item: ShoppingListItem) => {
    // Jeśli odznaczamy - wymagamy potwierdzenia
    if (item.is_checked) {
      setConfirmDialog({
        type: 'uncheck',
        itemId: item.id,
        itemName: item.ingredient_name,
      })
    } else {
      // Zaznaczanie - bez potwierdzenia
      toggleItem({ itemId: item.id, is_checked: true }, {
        onSuccess: () => {
          // Po zaznaczeniu sprawdź czy wszystkie są zaznaczone
          const newChecked = stats.checked + 1
          if (newChecked === stats.total) {
            // Wszystkie pozycje zaznaczone - zaproponuj zakończenie
            setConfirmDialog({ type: 'complete-all-checked' })
          }
        },
      })
    }
  }

  const handleConfirmUncheck = () => {
    if (confirmDialog?.type === 'uncheck' && confirmDialog.itemId) {
      toggleItem({ itemId: confirmDialog.itemId, is_checked: false })
    }
    setConfirmDialog(null)
  }

  const handleCompleteList = () => {
    if (allItemsChecked) {
      // Wszystkie zaznaczone - od razu zakończ
      completeList(undefined, {
        onSuccess: () => handleClose(),
      })
    } else {
      // Są niezaznaczone - wymagaj potwierdzenia
      setConfirmDialog({ type: 'complete-with-unchecked' })
    }
  }

  const handleConfirmComplete = () => {
    completeList(undefined, {
      onSuccess: () => {
        setConfirmDialog(null)
        handleClose()
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{shoppingList.title}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between -mt-2 pb-4 border-b">
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${shoppingList.is_completed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {shoppingList.is_completed ? 'Ukończona' : 'Aktywna'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onToggleAll}
              >
                {groupedShoppingItems.every((group) => collapsedCategories.has(group.category)) ? 'Rozwiń wszystkie' : 'Zwiń wszystkie'}
              </Button>
              {!shoppingList.is_completed && (
                <Button
                  variant="default"
                  onClick={handleCompleteList}
                >
                  Oznacz jako ukończone
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="shopping-progress">
              <div className="pill-row">
                <span className="pill">Dni: {shoppingList.days_count}</span>
                <span className="pill">Pozycje: {stats.total}</span>
                <span className="pill">Postęp: {Math.round(progress.ratio * 100)}% ({stats.checked}/{stats.total})</span>
              </div>

              <div className="progress">
                <div className="progress-bar" style={{ width: `${progress.ratio * 100}%` }} aria-label="Postęp listy" />
              </div>
            </div>

            <div className="checklist">
              {groupedShoppingItems.map((group) => (
                <div key={group.category} className="checklist-group">
                  <div className="checklist-group-head" onClick={() => onToggleCategory(group.category)} style={{ cursor: 'pointer' }}>
                    <div className="group-title">
                      <span>{group.category}</span>
                      <span className="muted">{group.items.length} poz.</span>
                    </div>
                    <button 
                      className="ghost" 
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCategory(group.category)
                      }}
                      aria-label={collapsedCategories.has(group.category) ? 'Rozwiń kategorię' : 'Zwiń kategorię'}
                    >
                      {collapsedCategories.has(group.category) ? '▶' : '▼'}
                    </button>
                  </div>
                  {!collapsedCategories.has(group.category) && (
                    <div className="checklist-items">
                      {group.items.map((item) => (
                        <label 
                          key={item.id} 
                          className={`checklist-item ${item.is_checked ? 'is-checked' : ''}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={item.is_checked ?? false}
                            onChange={() => handleItemToggle(item)}
                            disabled={shoppingList.is_completed}
                            aria-label={`Odhacz ${item.ingredient_name}`} 
                          />
                          <div className="checklist-copy">
                            <span>{item.ingredient_name}</span>
                            <span className="muted">{Number(item.total_amount).toFixed(0)} {item.unit.symbol}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia odznaczenia */}
      <Dialog open={confirmDialog?.type === 'uncheck'} onOpenChange={(isOpen) => !isOpen && setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Potwierdź akcję</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">Czy na pewno chcesz odznaczyć pozycję?</p>
            <p className="text-sm text-muted-foreground">{confirmDialog?.itemName}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Nie
            </Button>
            <Button onClick={handleConfirmUncheck}>
              Tak
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog propozycji zakończenia (wszystkie zaznaczone) */}
      <Dialog open={confirmDialog?.type === 'complete-all-checked'} onOpenChange={(isOpen) => !isOpen && setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Wszystkie pozycje zaznaczone!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Czy chcesz oznaczyć listę jako ukończoną?</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Nie teraz
            </Button>
            <Button onClick={handleConfirmComplete}>
              Tak, zakończ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog ostrzeżenia (są niezaznaczone) */}
      <Dialog open={confirmDialog?.type === 'complete-with-unchecked'} onOpenChange={(isOpen) => !isOpen && setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Na liście są aktywne pozycje</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Część pozycji nie została zaznaczona ({stats.total - stats.checked} z {stats.total}).
              <br />
              Czy na pewno chcesz zakończyć tę listę?
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Nie
            </Button>
            <Button variant="destructive" onClick={handleConfirmComplete}>
              Tak, zakończ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
