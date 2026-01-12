export type NavItem = {
  id: 'dashboard' | 'zwierzeta' | 'diety' | 'zakupy' | 'udostepnione' | 'profil'
  label: string
  description: string
  path: string
  badge?: string
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Przegląd dnia', path: '/dashboard' },
  { id: 'zwierzeta', label: 'Zwierzęta', description: 'Profile i współdzielenie', path: '/zwierzeta' },
  { id: 'diety', label: 'Diety', description: 'Skład i okresy', path: '/diety' },
  { id: 'zakupy', label: 'Zakupy', description: 'Checklisty i progres', path: '/zakupy' },
  { id: 'udostepnione', label: 'Udostępnione', description: 'Współdzielenie', path: '/udostepnione' },
  { id: 'profil', label: 'Profil', description: 'Dane użytkownika', path: '/profil' },
]

export const onboardingSteps = [
  { title: 'Dodaj zwierzę', body: 'Imię, gatunek, waga i notatki. Minimum danych, pełna kontrola.' },
  { title: 'Stwórz dietę', body: 'Zakres dat, składniki, kategorie i sposób przygotowania. System policzy dzienną porcję.' },
  { title: 'Wygeneruj listę zakupów', body: 'Wybierz diety, wpisz liczbę dni i otrzymaj checklistę do odhaczania.' },
]

