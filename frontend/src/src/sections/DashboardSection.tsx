import { useDashboard } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'
import { useUIStore } from '@/store/uiStore'
import {
  PawPrint,
  UtensilsCrossed,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react'

export function DashboardSection() {
  const { data: dashboard, isLoading, error } = useDashboard()
  const { openCreateAnimalModal, openCreateDietModal, openCreateShoppingListModal } = useUIStore()

  if (isLoading) {
    return (
      <section id="dashboard" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="dashboard" className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Nie udało się załadować danych dashboardu.</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!dashboard) return null

  const { stats, alerts } = dashboard
  const hasAlerts =
    alerts.animals_without_diet.length > 0 ||
    alerts.expiring_diets.length > 0 ||
    alerts.old_shopping_lists.length > 0

  return (
    <section id="dashboard" className="space-y-6">
      {/* Statystyki */}
      <div className="space-y-6">
        <SectionHeader eyebrow="Dashboard" title="Podsumowanie" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zwierzęta
              </CardTitle>
              <PawPrint className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.animals_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Aktywne profile</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktywne diety
              </CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_diets_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Obowiązujące dziś</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kończące się
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats.expiring_diets_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">W ciągu 7 dni</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Listy zakupów
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_shopping_lists_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Do zrealizowania</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ukończone
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completed_shopping_lists_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">W tym miesiącu</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Szybkie akcje */}
      <div className="space-y-6">
        <SectionHeader eyebrow="Akcje" title="Szybkie akcje" />
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            onClick={() => openCreateAnimalModal()}
            className="h-20 text-lg"
            variant="outline"
          >
            <Plus className="mr-2 h-5 w-5" />
            Dodaj zwierzę
          </Button>
          <Button
            onClick={() => openCreateDietModal()}
            className="h-20 text-lg"
            variant="outline"
          >
            <Plus className="mr-2 h-5 w-5" />
            Utwórz dietę
          </Button>
          <Button
            onClick={() => openCreateShoppingListModal()}
            className="h-20 text-lg"
            variant="outline"
          >
            <Plus className="mr-2 h-5 w-5" />
            Wygeneruj listę zakupów
          </Button>
        </div>
      </div>

      {/* Wymagające uwagi */}
      {hasAlerts && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <h2 className="text-3xl font-bold tracking-tight">Wymagające uwagi</h2>
          </div>
          <div className="space-y-4">
            {/* Zwierzęta bez diety */}
            {alerts.animals_without_diet.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-800">
                    Zwierzęta bez aktywnej diety ({alerts.animals_without_diet.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {alerts.animals_without_diet.map((animal) => (
                      <li key={animal.id} className="flex items-center justify-between">
                        <span className="text-amber-900">
                          {animal.name} ({animal.species})
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCreateDietModal(animal.id)}
                        >
                          Dodaj dietę
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Wygasające diety */}
            {alerts.expiring_diets.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-800">
                    Diety wygasające wkrótce ({alerts.expiring_diets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {alerts.expiring_diets.map((diet) => (
                      <li key={diet.id} className="flex items-center justify-between">
                        <span className="text-orange-900">
                          {diet.animal_name} - kończy się za {diet.days_left}{' '}
                          {diet.days_left === 1 ? 'dzień' : 'dni'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCreateDietModal(diet.animal_id)}
                        >
                          Nowa dieta
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Stare listy zakupów */}
            {alerts.old_shopping_lists.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">
                    Niekompletne listy zakupów ({alerts.old_shopping_lists.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {alerts.old_shopping_lists.map((list) => (
                      <li key={list.id} className="flex items-center justify-between">
                        <span className="text-blue-900">
                          {list.title} - {list.days_old} dni temu
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Przejście do sekcji zakupów - można rozbudować
                            window.location.hash = '#shopping'
                          }}
                        >
                          Sprawdź
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Brak alertów */}
      {!hasAlerts && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <p className="text-green-800 font-medium">
                Wszystko w porządku! Nie ma zadań wymagających uwagi.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
