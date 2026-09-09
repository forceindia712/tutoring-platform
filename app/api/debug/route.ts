import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

function present(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

export async function GET() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const status = {
    web: {
      apiKey: present(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: present(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      projectId: present(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      messagingSenderId: present(
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      ),
      appId: present(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    },
    serviceAccount: {
      projectId: present(process.env.FIREBASE_PROJECT_ID),
      clientEmail: present(process.env.FIREBASE_CLIENT_EMAIL),
      privateKey: present(privateKey),
      privateKeyStartsCorrectly: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      privateKeyLength: privateKey.length,
    },
    firestore: "not checked",
  };

  try {
    const snapshot = await getAdminFirestore()
      .collection("students")
      .limit(1)
      .get();
    status.firestore = `ok (${snapshot.size})`;
  } catch (error) {
    status.firestore =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  }

  return NextResponse.json(status);
}
