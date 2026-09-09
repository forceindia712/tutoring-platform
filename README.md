# Zajęcia – prosty panel spotkań nauczyciela z uczniami

Minimalistyczna aplikacja internetowa dla nauczyciela i uczniów. Nauczyciel dodaje uczniów, tworzy spotkania, dopisuje instrukcje, linki i materiały. Uczeń po podaniu imienia i nazwiska (albo po wejściu w indywidualny link) widzi wyłącznie swoje spotkania, instrukcje i materiały.

## Technologie

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript
- Tailwind CSS 4
- Firebase: Firestore (baza danych) i Firebase Auth (logowanie nauczyciela)
- Vercel – hosting

Aplikacja **nie używa Firebase Storage**. Materiały „Plik” to po prostu linki – np. do pliku udostępnionego z Google Drive. Dzięki temu nie trzeba włączać płatnego planu ani podpinać karty.

## Jak działa bezpieczeństwo

Firestore ma reguły bezpieczeństwa z pliku [`firestore.rules`](firestore.rules):

- niezalogowana osoba nie ma żadnego dostępu do danych;
- dane może czytać i zapisywać wyłącznie nauczyciel – sprawdzany po adresie e-mail w regułach;
- uczeń nie łączy się z Firestore bezpośrednio. Jego strony (`/s/[token]`) czyta serwer Next.js przez Firebase Admin SDK i zawsze filtruje dane po `student_access_token`.

Materiały plikowe nie trafiają do aplikacji – nauczyciel wkleja link do pliku (np. z Google Drive), a uczeń otwiera ten link. Żadne pliki nie są przechowywane ani pobierane przez Twoją bazę.

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
firestore.rules – reguły bezpieczeństwa Firestore
```

## Wymagania

- Node.js 20.9+
- konto [Firebase](https://firebase.google.com) – plan Spark (darmowy) wystarczy, bez karty płatniczej
- konto [Vercel](https://vercel.com)

## 1. Konfiguracja Firebase

1. Załóż projekt w konsoli Firebase.
2. Otwórz **Build → Firestore Database** i kliknij **Create database** (tryb produkcyjny, region np. `europe-west3`).
3. W pliku [`firestore.rules`](firestore.rules) zamień przykładowy `teacher@example.com` na adres e-mail nauczyciela.
4. W konsoli opublikuj reguły: **Firestore → Rules**.

Firebase Storage **nie włączamy** – aplikacja go nie używa.

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
  sort_order, created_at
```

Pole `url` służy zarówno typowi „Link”, jak i „Plik” – w obu przypadkach nauczyciel zapisuje adres strony lub udostępnionego pliku.

## 3. Firebase Auth (tylko nauczyciel)

1. W Firebase otwórz **Build → Authentication → Sign-in method** i włącz **Email/Password**.
2. W **Users** kliknij **Add user** i załóż konto nauczyciela (e-mail + hasło). Użyj dokładnie tego adresu, który wpisałeś do reguł bezpieczeństwa.
3. Reguły Firestore przepuszczają tylko tego jednego nauczyciela – nawet gdyby ktoś ręcznie założył sobie konto, nie zobaczy danych.

## 4. Aplikacja webowa i zmienne środowiskowe

1. W **Project settings → General → Your apps** kliknij ikonę `</>` (Web).
2. Zarejestruj aplikację i skopiuj z konsoli: `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`. Pole `storageBucket` nie jest potrzebne.
3. W **Project settings → Service accounts** kliknij **Generate new private key** – pobierzesz JSON konta serwisowego.

Skopiuj `.env.example` do `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
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
- dodawać do spotkania materiały: link, plik (link np. z Google Drive), tekst, zadanie lub notatkę;
- edytować, usuwać i zmieniać kolejność materiałów.

### Materiały „Plik” jako linki

Typ „Plik” nie wgrywa pliku do aplikacji. Wystarczy udostępnić plik w Google Drive (lub innej usłudze):

1. Google Drive → prawy przycisk na pliku → **Udostępnij**.
2. Wybierz „Każdy, kto ma link” i skopiuj link.
3. Wklej ten link w formularzu materiału.

Uczeń zobaczy przy materiale przycisk „Otwórz plik”.

## 7. Deployment na Vercel

1. Wrzuć projekt na GitHub.
2. W Vercel: **Add New → Project** i wybierz repozytorium.
3. Framework wykryje się automatycznie (Next.js).
4. Dodaj osiem zmiennych środowiskowych z sekcji 4 (wartości z Firebase).
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
- Firestore ma włączone reguły bezpieczeństwa – niezalogowany uczeń nie może odczytać bazy ani listy uczniów.
- Panel `/admin` jest chroniony przez Firebase Auth i sprawdzany przy wejściu przez komponent `AdminGate`.
- Imię i nazwisko nie jest przekazywane w URL – po zalogowaniu aplikacja używa losowego tokenu ucznia.
- Aplikacja nie przechowuje plików ani ich nie pobiera – materiały plikowe to linki (np. Google Drive), więc Firebase Storage nie jest potrzebny i nie trzeba podpinać karty.

## Możliwe rozszerzenia

- wysyłka linku e-mailem/SMS;
- przypomnienia o spotkaniach;
- konta dodatkowych nauczycieli z własnym `teacher_id` na dokumentach;
- spotkania grupowe (osobna kolekcja `meeting_students`).
