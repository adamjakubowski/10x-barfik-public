import { create } from 'zustand'
import type { DietDetail, ShoppingList } from '../api/types'

interface ModalState {
  animal: {
    id: number | null
    isCreating: boolean
    open: boolean
  }
  diet: {
    id: DietDetail['id'] | null
    isCreating: boolean
    preselectedAnimalId: number | null
    open: boolean
  }
  shoppingList: {
    id: ShoppingList['id'] | null
    isCreating: boolean
    open: boolean
  }
}

interface UIState {
  collapsedCategories: Set<string>
}

interface UIStore {
  modals: ModalState
  ui: UIState

  // Animal modal actions
  openAnimalModal: (id: number) => void
  openCreateAnimalModal: () => void
  closeAnimalModal: () => void

  // Diet modal actions
  openDietModal: (id: DietDetail['id']) => void
  openCreateDietModal: (preselectedAnimalId?: number | null) => void
  closeDietModal: () => void

  // Shopping list modal actions
  openShoppingListModal: (id: ShoppingList['id']) => void
  openCreateShoppingListModal: () => void
  closeShoppingListModal: () => void

  // UI actions
  toggleCategoryCollapse: (category: string) => void
  setCategoryCollapsed: (category: string, collapsed: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  modals: {
    animal: {
      id: null,
      isCreating: false,
      open: false,
    },
    diet: {
      id: null,
      isCreating: false,
      preselectedAnimalId: null,
      open: false,
    },
    shoppingList: {
      id: null,
      isCreating: false,
      open: false,
    },
  },
  ui: {
    collapsedCategories: new Set<string>(),
  },

  // Animal modal actions
  openAnimalModal: (id) =>
    set((state) => ({
      modals: {
        ...state.modals,
        animal: { id, isCreating: false, open: true },
      },
    })),

  openCreateAnimalModal: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        animal: { id: null, isCreating: true, open: true },
      },
    })),

  closeAnimalModal: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        animal: { id: null, isCreating: false, open: false },
      },
    })),

  // Diet modal actions
  openDietModal: (id) =>
    set((state) => ({
      modals: {
        ...state.modals,
        diet: { id, isCreating: false, preselectedAnimalId: null, open: true },
      },
    })),

  openCreateDietModal: (preselectedAnimalId = null) =>
    set((state) => ({
      modals: {
        ...state.modals,
        diet: { id: null, isCreating: true, preselectedAnimalId, open: true },
      },
    })),

  closeDietModal: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        diet: { id: null, isCreating: false, preselectedAnimalId: null, open: false },
      },
    })),

  // Shopping list modal actions
  openShoppingListModal: (id) =>
    set((state) => ({
      modals: {
        ...state.modals,
        shoppingList: { id, isCreating: false, open: true },
      },
    })),

  openCreateShoppingListModal: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        shoppingList: { id: null, isCreating: true, open: true },
      },
    })),

  closeShoppingListModal: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        shoppingList: { id: null, isCreating: false, open: false },
      },
    })),

  // UI actions
  toggleCategoryCollapse: (category) =>
    set((state) => {
      const newCollapsed = new Set(state.ui.collapsedCategories)
      if (newCollapsed.has(category)) {
        newCollapsed.delete(category)
      } else {
        newCollapsed.add(category)
      }
      return {
        ui: {
          ...state.ui,
          collapsedCategories: newCollapsed,
        },
      }
    }),

  setCategoryCollapsed: (category, collapsed) =>
    set((state) => {
      const newCollapsed = new Set(state.ui.collapsedCategories)
      if (collapsed) {
        newCollapsed.add(category)
      } else {
        newCollapsed.delete(category)
      }
      return {
        ui: {
          ...state.ui,
          collapsedCategories: newCollapsed,
        },
      }
    }),
}))
