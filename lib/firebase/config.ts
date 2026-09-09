export function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "";
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "";

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !messagingSenderId ||
    !appId
  ) {
    throw new Error(
      "Brak konfiguracji Firebase. Skopiuj .env.example do .env.local i uzupełnij dane z konsoli Firebase (Project settings → General → Your apps).",
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    messagingSenderId,
    appId,
  };
}
