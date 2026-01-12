# Produkt (PRD): Barfik App

**Wersja:** 1.0  
**Status:** Ready for Implementation  
**Product Lead:** Adam (PO)  
**Ostatnia aktualizacja:** 2026-01-03

---

## 1. Kontekst i Cel
**Barfik** to responsywna aplikacja webowa pomagająca właścicielom psów i kotów planować i przygotowywać posiłki BARF/gotowane w warunkach domowych. Projekt ma charakter hobbystyczny i będzie wykorzystywany w wąskim gronie (rodzina + znajomi), dlatego nie definiujemy w tym momencie celów biznesowych ani wskaźników KPI. Kluczowa potrzeba: uproszczenie obliczeń logistycznych i standaryzacja procesu przygotowywania posiłków.

### Strategia rozwiązania
* **Web-first:** Priorytetem jest wygodna wersja przeglądarkowa z pełnym RWD.
* **Architektura klient-serwer:** REST API pozwoli w przyszłości dodać lekką aplikację mobilną bez przebudowy backendu.
* **Zero social tracking:** Wyłącznie lokalne konta (e-mail/hasło), brak skryptów śledzących.

---

## 2. Grupa docelowa i scenariusze
* Właściciele zwierząt karmiących BARF/gotowane (1–3 zwierzęta na gospodarstwo domowe).
* Współopiekunowie lub petsitterzy, którym tymczasowo udostępnimy plan żywieniowy.
* Brak planów komercyjnych → brak wymagań dla płatności, subskrypcji czy wsparcia masowego ruchu.

---

## 3. User Stories (MVP)

| ID | Rola | Potrzeba | Korzyść dla użytkownika |
|:---|:---|:---|:---|
| **US.1** | Właściciel | Chcę założyć konto lokalne (e-mail/hasło) | Mam dostęp do danych niezależnie od zewnętrznych usług. |
| **US.2** | Właściciel | Chcę dodać profil zwierzęcia z wagą i podstawowymi danymi | Dopasowuję dietę do konkretnego pupila. |
| **US.3** | Właściciel | Chcę definiować skład dzienny (mięsa, suplementy, warzywa) | System wylicza porcje i proporcje. |
| **US.4** | Właściciel | Chcę określić liczbę dni zapasu | Dostaję listę zakupową i plan przygotowania. |
| **US.5 [POST-MVP]** | Właściciel | Chcę widzieć instrukcję krok po kroku przy mieszaniu | Minimalizuję ryzyko pomyłek. |
| **US.6** | Właściciel | Chcę udostępnić profil zwierzaka innemu użytkownikowi | Współopiekun ma aktualne dane. |
| **US.7** | Właściciel | Chcę checklistę zakupową z odhaczaniem | Kontroluję, co już kupiłem. |
| **US.8** | Właściciel | Chcę widzieć podsumowanie stanu systemu na stronie głównej | Szybko orientuję się w aktywnych dietach i zadaniach do wykonania. |

### Definition of Done dla user stories
* Dane zapisują się trwałe w lokalnej bazie (PostgreSQL).
* Najważniejsze ścieżki są testowane manualnie w desktop/mobile.
* Copy i etykiety w UI są po polsku.

---

## 4. Wymagania funkcjonalne (MVP)

### 4.1 Dashboard i przegląd stanu
* **FR.1.1:** Dashboard wyświetla kluczowe statystyki dostępne dla użytkownika:
  * Liczba zwierząt (aktywnych)
  * Liczba aktywnych diet (nie usuniętych)
  * Liczba diet wygasających w ciągu najbliższych 7 dni
  * Liczba aktywnych list zakupów (is_completed=false)
  * Liczba ukończonych list zakupów
* **FR.1.2:** Dashboard zawiera sekcję "Szybkie akcje" z przyciskami:
  * Dodaj nowe zwierzę
  * Utwórz dietę
  * Wygeneruj listę zakupów
* **FR.1.3:** Dashboard prezentuje listę "Wymagające uwagi":
  * Zwierzęta bez aktywnej diety
  * Diety kończące się w ciągu 7 dni
  * Niekompletne listy zakupów starsze niż 7 dni
* **FR.1.4:** Wszystkie statystyki i listy uwzględniają tylko dane, do których użytkownik ma dostęp (własne zwierzęta + udostępnione przez Collaboration).
* **FR.1.5:** Kliknięcie w statystykę lub element listy przekierowuje do odpowiedniej sekcji aplikacji.

### 4.2 Konta i bezpieczeństwo
* **FR.2.1:** Rejestracja i logowanie wyłącznie e-mail + hasło.
* **FR.2.2 [POST-MVP]:** Reset hasła przez link/token wysyłany e-mailem - funkcjonalność odłożona do kolejnej iteracji.
* **FR.2.3 [POST-MVP]:** Udostępnienie profilu zwierzaka przez zaproszenie e-mail - w MVP współopiekun dodawany bezpośrednio przez ID użytkownika.

### 4.3 Katalog zwierząt
* **FR.3.1:** CRUD profilu zwierzęcia.
* **FR.3.2:** Atrybuty minimalne: imię, typ, data urodzenia, aktualna waga, notatka (opcjonalna).

### 4.4 Definiowanie diety
* **FR.4.1:** Dieta obowiązuje w ramach zakresu dat (od–do) i jest przypisana do konkretnego zwierzęcia.
* **FR.4.2:** Struktura posiłku dziennego składa się z kategorii: Mięso surowe, Mięso gotowane, Warzywa, Suplementy, Inne - które wybierane są se słownika. 
* **FR.4.3:** System przelicza łączną masę dziennej porcji w gramach na podstawie sumy składników (g/ml/mg) i zapisuje ją w profilu diety.
* **FR.4.4:** Użytkownik wskazuje konkretne składniki diety wybierając odpowiednio ich nazwę kategorię, sposób przyrzadzenia (surowe czy gotowane) oraz ilośc i jednostkę miary 
* **FR.4.5:** Przy zapisainu diety - automatycznie wylicza się wielkość dziennej porcji 

### 4.5 Logistyka i przygotowanie
* **FR.5.1:** Kalkulator zakupów mnoży składniki przez liczbę dni (zapisaną w days_count) i generuje listę sumaryczną (np. 3000 g wołowiny).
* **FR.5.2 [POST-MVP]:** Widok „w kuchni" pokazuje instrukcję krok po kroku oraz checklistę dodawanych składników - funkcjonalność odłożona.
* **FR.5.3:** Widok zakupów udostępnia checklistę z filtrami po kategoriach (mięso, suplementy itd.).
* **FR.5.4:** Użytkownik ma dostęp do listy zakupów jeśli jest jej twórcą LUB ma dostęp (jako właściciel lub współpracownik) do co najmniej jednego zwierzęcia, którego dieta występuje na liście.

### 4.6 Dzielone użytkowanie
* **FR.6.1:** Właściciel decyduje, którzy współopiekunowie mają dostęp do diet i checklist.
* **FR.6.2 [POST-MVP]:** Historia zaproszeń pozwala ponownie wysłać link (retry) lub unieważnić dostęp - w MVP współpraca zarządzana bezpośrednio.

### 4.7 Mechanizmy pomocnicze i audyt
* **FR.7.1:** Wszystkie modele główne posiadają pola created_at i updated_at dla celów audytowych.
* **FR.7.2:** Soft delete (is_active) umożliwia odzyskanie usuniętych danych bez fizycznego kasowania z bazy.
* **FR.7.3:** Automatyczne przeliczanie jednostek - amount_in_base_unit w Ingredient obliczane przy zapisie.
* **FR.7.4:** Automatyczna aktualizacja total_daily_mass w Diet po zmianach składników.
* **FR.7.5:** Lista zakupów zawiera pole days_count określające liczbę dni, na które generowane są zakupy.
* **FR.7.6:** Status is_completed w ShoppingList pozwala oznaczać zakończone listy zakupów.
* **FR.7.7:** Pole title w ShoppingList umożliwia nadawanie opisowych nazw listom (np. "Zakupy na styczeń").

---

## 5. Wymagania techniczne

### 5.1 Stack
* **Frontend:** React + Tailwind CSS.
* **Backend:** Python (Django REST Framework).
* **Baza danych:** PostgreSQL.
* **Hosting docelowy:** dowolny VPS/domowy serwer (SSL Let’s Encrypt).

### 5.2 Model danych

#### Modele główne
* `User` - wykorzystywany z django.contrib.auth.models
* `Animal` (id, owner_id, species_id, name, date_of_birth, weight_kg, note, is_active, created_at, updated_at)
* `Diet` (id, animal_id, start_date, end_date, total_daily_mass, description, is_active, created_at, updated_at)
* `Ingredient` (id, diet_id, name, category_id, cooking_method, unit_id, amount, amount_in_base_unit, is_active, created_at, updated_at)
* `ShoppingList` (id, created_by_id, title, days_count, is_completed, is_active, created_at, updated_at) + relacja M2M z `Diet`
* `ShoppingListItem` (id, shopping_list_id, ingredient_name, unit_id, total_amount, is_checked, is_active, created_at, updated_at)
* `Collaboration` (id, animal_id, user_id, permission, is_active, created_at, updated_at)

#### Modele słownikowe
* `AnimalType` (id, name, created_at, updated_at) - słownik gatunków (pies, kot)
* `Unit` (id, name, symbol, conversion_factor, created_at, updated_at) - jednostki miar z przelicznikami
* `IngredientCategory` (id, code, name, description) - kategorie składników

#### Wspólne mechanizmy
* **TimeStampedModel** - abstrakcyjny model z polami created_at, updated_at
* **SoftDeletableMixin** - soft delete przez pole is_active
* **ActiveManager** - manager zwracający tylko aktywne rekordy (is_active=True)
* **Walidacje**: min. wartości dla amount, conversion_factor; sprawdzanie dat w Diet
* **Automatyka**: przeliczanie amount_in_base_unit w Ingredient.save()

#### Kluczowe różnice względem pierwotnego projektu
1. Dodano modele słownikowe dla normalizacji danych
2. Wszystkie modele mają soft delete i timestampy
3. ShoppingList jest osobnym modelem z powiązaniem M2M do Diet
4. Ingredient przechowuje cooking_method ('raw'/'cooked') zamiast subtype_raw_cooked
5. ShoppingListItem nie ma bezpośredniego powiązania z Ingredient - zawiera ingredient_name jako tekst

### 5.3 Niefunkcjonalne
* **Bezpieczeństwo:** hasła przechowywane jako bcrypt/scrypt. Brak integracji z social loginami.
* **RODO/Privacy:** dane pozostają na prywatnym serwerze właściciela projektu; brak transferu do usług trzecich.
* **Performance:** do 50 aktywnych profili zwierząt bez degradacji wydajności.
* **Dostępność:** aplikacja wymaga połączenia internetowego do działania (brak trybu offline w MVP).

### 5.4 Założenia i ograniczenia
* Projekt rozwijany hobbystycznie → brak formalnego SLA ani wsparcia 24/7.
* Brak potrzeby integracji z płatnościami czy dostawcami surowców.
* Wersjonowanie konfiguracji diet odbywa się poprzez snapshoty (kopie zapasowe bazy wykonywane ręcznie).

---

## 6. Roadmapa (po MVP)
* **PMVP.1:** Kalendarz sesji przygotowywania (batch cooking) z przypomnieniami.
* **PMVP.2:** Rejestr zmian wagi zwierzęcia + wykresy.
* **PMVP.3:** Dziennik zdrowia (objawy, alergie, jakość wypróżnień).
* **PMVP.4:** Baza wiedzy o suplementach z dawkowaniem i ostrzeżeniami.
* **PMVP.5:** Eksport/druk listy zakupów do PDF.

---

## 7. Wytyczne UX/UI
* **Mobile-first:** interfejs dostosowany do pracy na telefonie w kuchni (duże CTA, spacing >16 px).
* **Kontrast i czytelność:** tryb jasny z wysokim kontrastem w widoku „w kuchni”.
* **Checklisty dotykowe:** przyciski i checkboxy o wysokości min. 48 px.
* **Spójne nazewnictwo:** kategorie składników identyczne w diecie, liście zakupów i widoku instrukcji.
* **Bezpieczna nawigacja:** w krytycznych krokach (np. kasowanie diety) wymagane potwierdzenie modalem.

---

## 8. Otwarte kwestie
* Brak – tryb dark i automatyczne backupy uznano za zbędne na obecnym etapie hobbystycznego wdrożenia.