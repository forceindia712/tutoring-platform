# Zajęcia – prosty panel spotkań nauczyciela z uczniami

Minimalistyczna aplikacja internetowa dla nauczyciela i uczniów. Nauczyciel dodaje uczniów, tworzy spotkania, dopisuje instrukcje, linki i materiały. Uczeń po podaniu imienia i nazwiska (albo po wejściu w indywidualny link) widzi wyłącznie swoje spotkania, instrukcje i materiały.

## Technologie

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript
- Tailwind CSS 4
- Firebase: Firestore (baza danych), Firebase Auth (logowanie nauczyciela), Firebase Storage (pliki)
- Vercel – hosting

## Jak działa bezpieczeństwo

Firestore ma reguły bezpieczeństwa z pliku [`firestore.rules`](firestore.rules):

- niezalogowana osoba nie ma żadnego dostępu do danych;
- dane może czytać i zapisywać wyłącznie nauczyciel – sprawdzany po adresie e-mail w regułach;
- uczeń nie łączy się z Firestore bezpośrednio. Jego strony (`/s/[token]`) czyta serwer Next.js przez Firebase Admin SDK i zawsze filtruje dane po `student_access_token`.

Reguły Storage w [`storage.rules`](storage.rules) pozwalają wgrywać pliki tylko zalogowanemu nauczycielowi. Uczeń pobiera pliki przez linki zapisane w Firestore (linki z tokenem pobierania), więc nie potrzebuje konta.

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
  firebase/ – konfiguracja Firebase, Firebase Admin, warstwa dostępu do Firestore
  data/     – bezpieczne odczyty danych ucznia po tokenie (serwer)
firestore.rules  – reguły bezpieczeństwa Firestore
storage.rules    – reguły bezpieczeństwa Storage
```

## Wymagania

- Node.js 20.9+
- konto [Firebase](https://firebase.google.com) (plan Spark wystarczy na start)
- konto [Vercel](https://vercel.com)

## 1. Konfiguracja Firebase

1. Załóż projekt w konsoli Firebase.
2. Otwórz **Build → Firestore Database** i kliknij **Create database** (tryb produkcyjny, region np. `europe-west3`).
3. W plikach [`firestore.rules`](firestore.rules) i [`storage.rules`](storage.rules) zamień przykładowy `teacher@example.com` na adres e-mail nauczyciela.
4. W konsoli opublikuj reguły: **Firestore → Rules** oraz **Storage → Rules**.

## 2. Tworzenie danych w Firestore

Firestore nie wymaga definiowania tabel ani schematu. Dokumenty tworzy sama aplikacja. Kolekcje i pola:

```text
students
  id, first_name, last_name, email, notes,
  student_access_token, search_name, created_at

meetings
  id, student_id, meeting_number, meeting_date, meeting_time,
  meeting_url, instructions, notes, created_at, updated_at

materials
  id, meeting_id, type, title, description, url,
  file_url, file_path, sort_order, created_at
```

## 3. Firebase Auth (tylko nauczyciel)

1. W Firebase otwórz **Build → Authentication → Sign-in method** i włącz **Email/Password**.
2. W **Users** kliknij **Add user** i załóż konto nauczyciela (e-mail + hasło). Użyj dokładnie tego adresu, który wpisałeś do reguł bezpieczeństwa.
3. Reguły Firestore i Storage przepuszczają tylko tego jednego nauczyciela – nawet gdyby ktoś ręcznie założył sobie konto, nie zobaczy danych.

## 4. Aplikacja webowa i zmienne środowiskowe

1. W **Project settings → General → Your apps** kliknij ikonę `</>` (Web).
2. Zarejestruj aplikację i skopiuj obiekt konfiguracji (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
3. W **Project settings → Service accounts** kliknij **Generate new private key** – pobierzesz JSON konta serwisowego.

Skopiuj `.env.example` do `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Zmienne `NEXT_PUBLIC_*` są publiczne – tak ma być. Zmienne `FIREBASE_*` pochodzą z pliku JSON konta serwisowego:

| Pole w JSON | Zmienna |
| --- | --- |
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

`FIREBASE_PRIVATE_KEY` to długi klucz z wieloma znakami nowej linii. W `.env.local` możesz wstawić cały klucz w cudzysłowie. Jeśli wklejasz go z `\n` jako tekstem, aplikacja zamieni `\n` na prawdziwe nowe linie.

## 5. Uruchomienie lokalne

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

## 6. Jak działa aplikacja

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

## 7. Deployment na Vercel

1. Wrzuć projekt na GitHub.
2. W Vercel: **Add New → Project** i wybierz repozytorium.
3. Framework wykryje się automatycznie (Next.js).
4. Dodaj dziewięć zmiennych środowiskowych z sekcji 4 (wartości z Firebase).
5. Kliknij **Deploy**.

Gotowe. Panel nauczyciela znajdziesz pod `https://twojadomena.pl/admin`.

## 8. Wrzucenie na GitHub (krótko)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/tutoring-platform.git
git push -u origin main
```

## Uwagi o bezpieczeństwie

- Klucze konta serwisowego (`FIREBASE_*`) są używane tylko w kodzie serwerowym; nie ma ich w bundle'u klienckim.
- Firestore i Storage mają włączone reguły bezpieczeństwa – niezalogowany uczeń nie może odczytać bazy ani listy uczniów.
- Panel `/admin` jest chroniony przez Firebase Auth i sprawdzany przy wejściu przez komponent `AdminGate`.
- Imię i nazwisko nie jest przekazywane w URL – po zalogowaniu aplikacja używa losowego tokenu ucznia.
- Pliki wgrywane są do prywatnego Storage, a uczeń pobiera je po linkach z tokenem pobierania.

## Możliwe rozszerzenia

- wysyłka linku e-mailem/SMS;
- przypomnienia o spotkaniach;
- konta dodatkowych nauczycieli z własnym `teacher_id` na dokumentach;
- spotkania grupowe (osobna kolekcja `meeting_students`).
