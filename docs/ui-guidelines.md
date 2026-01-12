# 🎨 Barfik – Visual UI Guidelines

## 1. Założenia ogólne (Design Principles)

### Charakter interfejsu
- Spokojny, domowy, neutralny emocjonalnie
- Wysokie poczucie porządku i kontroli
- Brak presji, brak agresywnych akcentów
- Interfejs „do pracy”, nie do konsumowania treści

### Główne zasady
- Clarity > Density – czytelność ważniejsza niż ilość informacji
- Consistency over novelty – brak eksperymentów wizualnych
- Touch-friendly by default – ergonomia również na desktopie
- Visual hierarchy through spacing, not color


## 2. Kolorystyka (Color System)

### 2.1 Paleta bazowa

**Primary (zielony kuchenny)**  
- #2F855A  
Zastosowanie: primary CTA, stany aktywne, kluczowe podsumowania

**Tło aplikacji**
- #F9FAF7

**Surface / karty**
- Surface: #FFFFFF  
- Border: #E5E7EB

### 2.2 Tekst
- Primary: #1F2937
- Secondary: #6B7280
- Disabled: #9CA3AF

### 2.3 Stany systemowe
- Success: #2F855A
- Warning: #D97706
- Error: #B91C1C
- Info: #2563EB

### 2.4 Kolory semantyczne (kategorie)
Używane wyłącznie jako akcent/badge:
- Mięso: #7F1D1D
- Warzywa: #166534
- Suplementy: #1E3A8A
- Inne: #374151


## 3. Typografia

### Font
Systemowy stack bez custom fontów:
Inter, system-ui, -apple-system, sans-serif

### Skala
- Page title: 20–22 px / 600
- Section title: 16–18 px / 600
- Body: 14–16 px / 400
- Meta: 12–13 px / 400
- Kluczowe liczby: 32–36 px / 700

Zasady:
- Liczby są wizualnie dominujące
- Kolor nie buduje hierarchii – robi to rozmiar i spacing


## 4. Layout i spacing

- Mobile-first
- Max width desktop: 640–720 px
- Global padding: 16 px
- Spacing sekcji: 16–24 px

### Spacing scale
- 4 px – micro
- 8 px – elementy wewnętrzne
- 16 px – sekcje
- 24 px – bloki logiczne
- 32+ px – podsumowania


## 5. Komponenty bazowe

### Karty
- Radius: 12 px
- Border 1px
- Shadow: bardzo subtelny (shadow-sm)

### Przyciski
**Primary**
- Tło primary
- Tekst biały
- Min height 48 px
- Radius 12 px

**Secondary**
- Border + tekst primary

**Destructive**
- Border + tekst error
- Nigdy primary

### Checklisty
- Checkbox min. 28–32 px
- Cały wiersz klikalny
- Zaznaczone elementy lekko wyszarzone


## 6. Ikony
- Styl outline
- Heroicons / Lucide
- 20–24 px w listach
- Tylko gdy skracają czas rozpoznania


## 7. Animacje
- Transition 150–200 ms
- Ease-out
- Tylko dla hover, focus, state
- Brak springów i animacji marketingowych


## 8. Stany UI

### Empty state
- Ikona + 1 zdanie + 1 CTA
- Język ludzki, nie systemowy

### Loading
- Skeleton UI
- Spinner tylko lokalnie


## 9. Dostępność
- WCAG AA
- Hit area min. 44–48 px
- Widoczny focus
- Kolor nigdy jedynym nośnikiem informacji


## 10. Filozofia
Barfik to narzędzie kuchenne:
czytelne, spokojne, przewidywalne.
