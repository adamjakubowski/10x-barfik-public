import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export interface DashboardStats {
  animals_count: number
  active_diets_count: number
  expiring_diets_count: number
  active_shopping_lists_count: number
  completed_shopping_lists_count: number
}

export interface AnimalWithoutDiet {
  id: number
  name: string
  species: string
}

export interface ExpiringDiet {
  id: number
  animal_id: number
  animal_name: string
  end_date: string
  days_left: number
}

export interface OldShoppingList {
  id: number
  title: string
  created_at: string
  days_old: number
}

export interface DashboardAlerts {
  animals_without_diet: AnimalWithoutDiet[]
  expiring_diets: ExpiringDiet[]
  old_shopping_lists: OldShoppingList[]
}

export interface DashboardData {
  stats: DashboardStats
  alerts: DashboardAlerts
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/dashboard/stats/')
      return data
    },
    staleTime: 1000 * 60 * 2, // 2 minuty - dashboard powinien się często odświeżać
  })
}
