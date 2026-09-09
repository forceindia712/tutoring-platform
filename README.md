# Zajęcia – prosty panel spotkań nauczyciela z uczniami

Minimalistyczna aplikacja internetowa dla nauczyciela i uczniów. Nauczyciel dodaje uczniów, tworzy spotkania, dopisuje instrukcje, linki i materiały. Uczeń po podaniu imienia i nazwiska (albo po wejściu w indywidualny link) widzi wyłącznie swoje spotkania, instrukcje i materiały.

## Technologie

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript
- Tailwind CSS 4
- Supabase: PostgreSQL + Row Level Security, Auth, Storage
- Vercel – hosting

## Struktura projektu

```text
app/
  page.tsx                        – logowanie ucznia (imię i nazwisko)
  s/[token]/page.tsx              – panel ucznia
  s/[token]/meeting/[id]/page.tsx – szczegóły spotkania ucznia
  admin/page.tsx                  – logowanie nauczyciela
  admin/(panel)/dashboard         – dashboard nauczyciela
  admin/(panel)/students          – lista uczniów
  admin/(panel)/students/[id]     – profil ucznia
  admin/(panel)/meetings/new      – nowe spotkanie
  admin/(panel)/meetings/[id]     – edycja spotkania i materiały
  api/student/lookup/route.ts     – bezpieczne wyszukanie ucznia po imieniu i nazwisku
components/
  student/  – StudentLogin, StudentDashboard, MeetingCard, MeetingDetails, MaterialCard
  admin/    – AdminLogin, AdminDashboard, StudentList, StudentForm, MeetingForm, MaterialForm i in.
lib/
  supabase/ – klienci: przeglądarka, serwer (Auth), serwis (dane ucznia)
  data/     – bezpieczne odczyty danych ucznia po tokenie
supabase/schema.sql – tabele, RLS i Storage
proxy.ts   – sprawdza sesję nauczyciela przed wejściem do /admin
```

## Wymagania

- Node.js 20.9+
- konto [Supabase](https://supabase.com)
- konto [Vercel](https://vercel.com) (do wdrożenia)

## 1. Konfiguracja Supabase

1. Załóż projekt w Supabase.
2. Otwórz **SQL Editor** i uruchom całą zawartość pliku [`supabase/schema.sql`](supabase/schema.sql).

Plik tworzy trzy tabele:

```text
students  – id, imię, nazwisko, e-mail, notatki, student_access_token, created_at
meetings  – id, student_id, meeting_number, data, godzina, url, instrukcje, notatka
materials – id, meeting_id, typ, tytuł, opis, url, file_url, sort_order
```

Włącza Row Level Security i dodaje polityki:

- `anon` (niezalogowany) nie może nic odczytać ani zapisać;
- `authenticated` (zalogowany nauczyciel) może zarządzać wszystkimi danymi;
- Storage ma prywatny koszyk `meeting-materials` – pliki może wgrywać tylko nauczyciel.

Uczeń nigdy nie łączy się bezpośrednio z bazą. Strony `/s/...` pobierają dane po stronie serwera Next.js, zawsze filtrowane po `student_access_token`, więc uczeń widzi tylko swoje dane.

## 2. Konfiguracja Auth (tylko nauczyciel)

1. W Supabase otwórz **Authentication → Providers → Email** i upewnij się, że provider e-mail jest włączony.
2. W **Authentication → Settings** wyłącz opcję **Allow new users to sign up** (nowe konta zakładać może wyłącznie właściciel projektu).
3. Utwórz konto nauczyciela:
   - **Authentication → Users → Add user**, albo
   - tymczasowo włącz rejestrację, załóż konto w aplikacji (`/admin`), a potem znów ją wyłącz.

## 3. Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` i uzupełnij:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Wartości znajdziesz w Supabase: **Project Settings → API**.

| Zmienna | Gdzie używa się | Uwagi |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | przeglądarka i serwer | publiczna |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | przeglądarka i serwer | publiczna, chroniona przez RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | tylko serwer | klucz serwisowy – nigdy nie trafia do przeglądarki; używa go wyłącznie kod serwerowy stron ucznia |

## 4. Uruchomienie lokalne

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

## 5. Jak działa aplikacja

### Strona ucznia

1. Uczeń wpisuje imię i nazwisko na stronie głównej.
2. Serwer porównuje dane bez polskich znaków i wielkości liter, a następnie przekierowuje na indywidualny adres `/s/[token]`.
3. Uczeń widzi nadchodzące i wcześniejsze spotkania. Po otwarciu spotkania widzi instrukcje, notatkę i materiały.

### Link ucznia

Po dodaniu ucznia aplikacja pokazuje jego prywatny link, np.:

```text
https://twojadomena.pl/s/x7Rk92Lm
```

Możesz go wysłać uczniowi – wtedy nie musi nawet wpisywać imienia i nazwiska. Link jest nośnikiem dostępu, dlatego wysyłaj go tylko bezpośrednio do ucznia.

### Panel nauczyciela (`/admin`)

Po zalogowaniu możesz:

- dodawać, edytować i usuwać uczniów;
- kopiować indywidualny link ucznia;
- tworzyć spotkania (numer domyślnie wyliczany jako następny);
- edytować daty, godziny, linki online, instrukcje i notatki;
- dodawać do spotkania materiały: link, plik, tekst, zadanie lub notatkę;
- edytować, usuwać i zmieniać kolejność materiałów.

## 6. Deployment na Vercel

1. Wrzuć projekt na GitHub (patrz niżej).
2. W Vercel: **Add New → Project** i wybierz repozytorium.
3. Framework wykryje się automatycznie (Next.js).
4. Dodaj trzy zmienne środowiskowe z sekcji 3 (wartości z Supabase).
5. Kliknij **Deploy**.

Gotowe. Panel nauczyciela znajdziesz pod `https://twojadomena.pl/admin`.

## 7. Wrzucenie na GitHub (krótko)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/tutoring-platform.git
git push -u origin main
```

## Uwagi o bezpieczeństwie

- Klucz `SUPABASE_SERVICE_ROLE_KEY` jest używany tylko w kodzie serwerowym; nie ma go w bundle'u klienckim.
- Wszystkie tabele mają włączone RLS. Bez polityk dla roli `anon` uczeń nie ma żadnego bezpośredniego dostępu do bazy.
- Panel `/admin` chroni `proxy.ts` + Supabase Auth.
- Imię i nazwisko nie jest przekazywane w URL – po zalogowaniu aplikacja używa losowego tokenu.
- Pliki wgrywane są do prywatnego koszyka, a uczeń pobiera je przez krótkotrwałe podpisane URL-e generowane na serwerze.

## Możliwe rozszerzenia

- wysyłka linku e-mailem/SMS;
- przypomnienia o spotkaniach;
- dodatkowe konta nauczycieli (wtedy warto rozszerzyć RLS o tabelę `teachers`);
- podział spotkań grupowych (dodanie tabeli pośredniej `meeting_students`).
