import { useMemo } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import './App.css'
import type { AnimalDetail, Diet, ShoppingList } from './api/types'
import type { NavItem } from './data/mockData'
import { navItems } from './data/mockData'
import { useAnimals } from './hooks/useAnimals'
import { useDiets } from './hooks/useDiets'
import { useShoppingLists } from './hooks/useShoppingLists'
import { shoppingListsApi } from './api/services'
import { Sidebar } from './components/navigation/Sidebar'
import { BottomNav } from './components/navigation/BottomNav'
import { Topbar } from './components/layout/Topbar'
import { DashboardSection } from './sections/DashboardSection'
import { AnimalsSection } from './sections/AnimalsSection'
import { DietsSection } from './sections/DietsSection'
import { ShoppingSection } from './sections/ShoppingSection'
import { CollaborationsSection } from './sections/CollaborationsSection'
import { ProfileSection } from './sections/ProfileSection'
import { ModalManager } from './components/ModalManager'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './hooks/useAuth'
import { queryClient } from './lib/queryClient'
import { useUIStore } from './store/uiStore'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorProvider } from './lib/errorHandler'

type AppOutletContext = {
  animals: AnimalDetail[]
  diets: Diet[]
  shoppingLists: ShoppingList[]
  isLoadingAnimals: boolean
  isLoadingDiets: boolean
  onToggleCompleteList: (id: number, isCompleted: boolean) => void
  getProgress: (list: ShoppingList) => { ratio: number; total: number; checked: number }
}

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClientInstance = useQueryClient()

  // Pobieranie rzeczywistych danych z API
  const { data: animalsData, isLoading: isLoadingAnimals } = useAnimals()
  const { data: dietsData, isLoading: isLoadingDiets } = useDiets({ active: undefined }) // undefined = pobierz wszystkie (aktywne i nieaktywne)
  const { data: shoppingListsData } = useShoppingLists()

  const animals = animalsData?.results || []
  const diets = dietsData?.results || []
  const shoppingLists = shoppingListsData?.results || []

  const currentNav = useMemo(
    () => navItems.find((item) => location.pathname.startsWith(item.path)),
    [location.pathname],
  )
  const activeSection = currentNav?.id ?? 'dashboard'

  const getShoppingListProgress = (list: ShoppingList) => {
    const total = list.items.length
    const checked = list.items.filter((item) => item.is_checked).length
    const ratio = total === 0 ? 0 : checked / total
    return { total, checked, ratio }
  }

  const handleToggleCompleteShoppingList = async (id: number, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await shoppingListsApi.uncomplete(id)
      } else {
        await shoppingListsApi.complete(id)
      }
      queryClientInstance.invalidateQueries({ queryKey: ['shopping-lists'], exact: false })
    } catch {
      // Error handled silently - invalidation will restore correct state
    }
  }

  const handleNav = (id: NavItem['id']) => {
    const target = navItems.find((item) => item.id === id)
    if (target) {
      navigate(target.path)
    }
  }


  return (
    <div className="page">
      <Sidebar
        navItems={navItems}
        activeSection={activeSection}
        onSelect={handleNav}
        onAddAnimal={useUIStore.getState().openCreateAnimalModal}
      />

      <div className="main">
        <Topbar
          eyebrow={currentNav?.label}
          title="Planowanie BARF i gotowanych"
          subtitle="Zaplanuj skład, przygotuj zakupy i współdziel plany z innymi opiekunami."
          actions={(
            <>
              <button className="secondary" onClick={() => useUIStore.getState().openCreateDietModal()}>Nowa dieta</button>
              <button className="primary" onClick={() => useUIStore.getState().openCreateShoppingListModal()}>Nowa lista zakupów</button>
            </>
          )}
        />

        <Outlet
          context={{
            animals,
            diets,
            shoppingLists,
            isLoadingAnimals,
            isLoadingDiets,
            onToggleCompleteList: handleToggleCompleteShoppingList,
            getProgress: getShoppingListProgress,
          } satisfies AppOutletContext}
        />
      </div>

      <BottomNav navItems={navItems} activeSection={activeSection} onSelect={handleNav} />

      <ModalManager animals={animals} diets={diets} />
    </div>
  )
}

function useAppOutlet() {
  return useOutletContext<AppOutletContext>()
}

function AnimalsRoute() {
  const ctx = useAppOutlet()

  if (ctx.isLoadingAnimals) {
    return (
      <section id="zwierzeta" className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Twoje zwierzęta</p>
            <h2>Karty profili</h2>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="muted">Ładowanie zwierząt...</p>
        </div>
      </section>
    )
  }

  return <AnimalsSection animals={ctx.animals} diets={ctx.diets} />
}

function DietsRoute() {
  const ctx = useAppOutlet()
  const [searchParams, setSearchParams] = useSearchParams()
  const animalIdParam = searchParams.get('animal')

  // Filtruj diety według wybranego zwierzęcia
  const filteredDiets = useMemo(() => {
    if (!animalIdParam) return ctx.diets
    const animalId = parseInt(animalIdParam, 10)
    return ctx.diets.filter(diet => diet.animal === animalId)
  }, [ctx.diets, animalIdParam])

  // Znajdź nazwę zwierzęcia dla wybranego filtra
  const selectedAnimal = useMemo(() => {
    if (!animalIdParam) return null
    const animalId = parseInt(animalIdParam, 10)
    return ctx.animals.find(a => a.id === animalId)
  }, [ctx.animals, animalIdParam])

  if (ctx.isLoadingDiets) {
    return (
      <section id="diety" className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Diety</p>
            <h2>Zakresy i sumy dzienne</h2>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="muted">Ładowanie diet...</p>
        </div>
      </section>
    )
  }

  return (
    <section id="diety" className="section">
      {selectedAnimal && (
        <div className="mb-6 flex items-center gap-3 px-1">
          <span className="pill">Zwierzę: {selectedAnimal.name}</span>
          <button
            className="ghost text-sm"
            onClick={() => setSearchParams({})}
          >
            Pokaż wszystkie diety
          </button>
        </div>
      )}
      <DietsSection diets={filteredDiets} />
    </section>
  )
}

function ShoppingRoute() {
  const ctx = useAppOutlet()
  return (
    <ShoppingSection
      shoppingLists={ctx.shoppingLists}
      getProgress={ctx.getProgress}
      onToggleComplete={ctx.onToggleCompleteList}
    />
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<AppShell />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardSection />} />
                    <Route path="/zwierzeta" element={<AnimalsRoute />} />
                    <Route path="/diety" element={<DietsRoute />} />
                    <Route path="/zakupy" element={<ShoppingRoute />} />
                    <Route path="/udostepnione" element={<CollaborationsSection />} />
                    <Route path="/profil" element={<ProfileSection />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorProvider>
    </ErrorBoundary>
  )
}

export default App
