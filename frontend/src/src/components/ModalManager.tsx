import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimalModal } from '../modals/AnimalModal'
import { NewAnimalModal } from '../modals/NewAnimalModal'
import { DietModal } from '../modals/DietModal'
import { NewDietModal } from '../modals/NewDietModal'
import { ShoppingListModal } from '../modals/ShoppingListModal'
import { NewShoppingListModal } from '../modals/NewShoppingListModal'
import { useUIStore } from '../store/uiStore'
import { useAnimal, useUpdateAnimal, useCreateAnimal } from '../hooks/useAnimals'
import { useDiet, useCreateDiet, useUpdateDiet } from '../hooks/useDiets'
import { useShoppingList, useCreateShoppingList } from '../hooks/useShoppingLists'
import { useAnimalTypes, useUnits, useIngredientCategories } from '../hooks/useDictionaries'
import type { AnimalDetail, Diet, ShoppingList } from '../api/types'
import { useErrorHandler } from '../lib/errorHandler'
import { getErrorMessage } from '../lib/apiErrors'

interface ModalManagerProps {
  animals: AnimalDetail[]
  diets: Diet[]
}

export function ModalManager({ animals, diets }: ModalManagerProps) {
  const navigate = useNavigate()
  const { showError } = useErrorHandler()

  const { modals, ui, closeAnimalModal, closeDietModal, closeShoppingListModal } = useUIStore()

  // Filtruj tylko aktywne zwierzęta dla modalu tworzenia diety
  const activeAnimals = useMemo(() => animals.filter(a => a.is_active), [animals])

  // Pobieranie słowników
  const { data: animalTypesData } = useAnimalTypes()
  const { data: unitsData } = useUnits()
  const { data: ingredientCategoriesData } = useIngredientCategories()

  const animalTypes = animalTypesData?.results || []
  const units = unitsData?.results || []
  const ingredientCategories = ingredientCategoriesData?.results || []

  // Pobieranie szczegółów dla wybranych elementów
  const { data: selectedAnimalData } = useAnimal(modals.animal.id || 0)
  const { data: selectedDietData } = useDiet(modals.diet.id || 0)
  const { data: selectedShoppingListData } = useShoppingList(modals.shoppingList.id || 0)

  const selectedAnimal = selectedAnimalData
  const selectedDiet = selectedDietData
  const selectedShoppingList = selectedShoppingListData

  // Mutations
  const updateAnimal = useUpdateAnimal(modals.animal.id || 0)
  const createAnimal = useCreateAnimal()
  const updateDiet = useUpdateDiet(modals.diet.id || 0)
  const createDiet = useCreateDiet()
  const createShoppingList = useCreateShoppingList()

  // Shopping list stats
  const shoppingListStats = useMemo(() => {
    if (!selectedShoppingList) return { total: 0, checked: 0 }
    const total = selectedShoppingList.items.length
    const checked = selectedShoppingList.items.filter((item) => item.is_checked).length
    return { total, checked }
  }, [selectedShoppingList])

  const allCategoriesCollapsed = useMemo(() => {
    if (!selectedShoppingList) return false
    const categories = Array.from(
      new Set(selectedShoppingList.items.map((item) => item.category || 'Inne')),
    )
    if (categories.length === 0) return false
    return categories.every((category) => ui.collapsedCategories.has(category))
  }, [ui.collapsedCategories, selectedShoppingList])

  const getShoppingListProgress = (list: ShoppingList) => {
    const total = list.items.length
    const checked = list.items.filter((item) => item.is_checked).length
    const ratio = total === 0 ? 0 : checked / total
    return { total, checked, ratio }
  }

  // Handlers
  const handleSaveAnimal = async (data: {
    species_id: number
    name: string
    date_of_birth?: string | null
    weight_kg?: string | null
    note?: string
  }) => {
    try {
      await updateAnimal.mutateAsync(data)
      closeAnimalModal()
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się zaktualizować zwierzęcia')
      throw error
    }
  }

  const handleSaveNewAnimal = async (data: {
    species_id: number
    name: string
    date_of_birth?: string | null
    weight_kg?: string | null
    note?: string
  }) => {
    try {
      await createAnimal.mutateAsync(data)
      closeAnimalModal()
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się dodać zwierzęcia')
      throw error
    }
  }

  const handleSaveDiet = async (data: {
    start_date: string
    end_date?: string | null
    description?: string
  }) => {
    try {
      await updateDiet.mutateAsync(data)
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się zaktualizować diety')
      throw error
    }
  }

  const handleSaveNewDiet = async (input: {
    animal_id: number
    start_date: string
    end_date?: string | null
    description?: string
  }) => {
    try {
      const result = await createDiet.mutateAsync({
        animal_id: input.animal_id,
        start_date: input.start_date,
        end_date: input.end_date,
        description: input.description,
      })
      closeDietModal()
      navigate('/diety')
      // Automatycznie otwórz utworzoną dietę
      useUIStore.getState().openDietModal(result.data.id)
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się utworzyć diety')
      throw error
    }
  }

  const handleSaveNewShoppingList = async (input: { title: string; daysCount: number; dietIds: number[] }) => {
    try {
      const result = await createShoppingList.mutateAsync({
        title: input.title,
        days_count: input.daysCount,
        diets: input.dietIds,
      })
      closeShoppingListModal()
      // Automatycznie otwórz szczegóły listy zakupów
      useUIStore.getState().openShoppingListModal(result.data.id)
      navigate('/zakupy')
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się utworzyć listy zakupów')
      throw error
    }
  }

  return (
    <>
      {/* Animal Modal */}
      {selectedAnimal && animalTypes.length > 0 && !modals.animal.isCreating ? (
        <AnimalModal
          animal={selectedAnimal}
          animalTypes={animalTypes}
          open={modals.animal.open}
          onOpenChange={(open) => !open && closeAnimalModal()}
          onSave={handleSaveAnimal}
        />
      ) : null}

      {/* New Animal Modal */}
      {modals.animal.isCreating && animalTypes.length > 0 ? (
        <NewAnimalModal
          animalTypes={animalTypes}
          open={modals.animal.open}
          onOpenChange={(open) => !open && closeAnimalModal()}
          onSave={handleSaveNewAnimal}
        />
      ) : null}

      {/* Diet Modal */}
      {selectedDiet && units.length > 0 && ingredientCategories.length > 0 && !modals.diet.isCreating ? (
        <DietModal
          diet={selectedDiet}
          ingredientCategories={ingredientCategories}
          units={units}
          open={modals.diet.open}
          onOpenChange={(open) => !open && closeDietModal()}
          onSave={handleSaveDiet}
        />
      ) : null}

      {/* New Diet Modal */}
      {modals.diet.isCreating ? (
        <NewDietModal
          animals={activeAnimals}
          preselectedAnimalId={modals.diet.preselectedAnimalId}
          open={modals.diet.open}
          onOpenChange={(open) => !open && closeDietModal()}
          onSave={handleSaveNewDiet}
        />
      ) : null}

      {/* Shopping List Modal */}
      {selectedShoppingList && !modals.shoppingList.isCreating ? (
        <ShoppingListModal
          shoppingList={selectedShoppingList}
          collapsedCategories={ui.collapsedCategories}
          onToggleCategory={useUIStore.getState().toggleCategoryCollapse}
          onToggleAll={() => {
            if (!selectedShoppingList) return
            if (allCategoriesCollapsed) {
              // Reset all categories
              selectedShoppingList.items.forEach((item) => {
                const category = item.category || 'Inne'
                useUIStore.getState().setCategoryCollapsed(category, false)
              })
              return
            }
            // Collapse all categories
            selectedShoppingList.items.forEach((item) => {
              const category = item.category || 'Inne'
              useUIStore.getState().setCategoryCollapsed(category, true)
            })
          }}
          stats={shoppingListStats}
          getProgress={getShoppingListProgress}
          open={modals.shoppingList.open}
          onOpenChange={(open) => !open && closeShoppingListModal()}
        />
      ) : null}

      {/* New Shopping List Modal */}
      {modals.shoppingList.isCreating ? (
        <NewShoppingListModal
          diets={diets}
          open={modals.shoppingList.open}
          onOpenChange={(open) => !open && closeShoppingListModal()}
          onSave={handleSaveNewShoppingList}
        />
      ) : null}
    </>
  )
}
