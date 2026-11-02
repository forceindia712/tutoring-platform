import "server-only";

import nodemailer from "nodemailer";

export type MailResult =
  | { kind: "accepted"; messageId: string }
  | { kind: "failed"; message: string }
  // Nie wiadomo, czy serwer SMTP przyjął wiadomość (np. timeout po wysłaniu).
  | { kind: "unknown"; message: string };

export function isMailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return { kind: "failed", message: "Brak konfiguracji poczty (GMAIL_USER, GMAIL_APP_PASSWORD)." };
  }

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, "") },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    const info = await transport.sendMail({
      from: { name: process.env.MAIL_FROM_NAME || "Zajęcia", address: user },
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (info.accepted.length === 0) {
      return { kind: "failed", message: "Serwer pocztowy odrzucił adresata." };
    }
    return { kind: "accepted", messageId: info.messageId };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "EAUTH") {
      return {
        kind: "failed",
        message: "Logowanie do Gmaila nie powiodło się. Sprawdź hasło aplikacji.",
      };
    }
    if (code === "EENVELOPE") {
      return { kind: "failed", message: "Nieprawidłowy adres odbiorcy." };
    }
    if (code === "ETIMEDOUT" || code === "ESOCKET") {
      return {
        kind: "unknown",
        message: "Przekroczono czas oczekiwania. Nie wiadomo, czy wiadomość wyszła.",
      };
    }
    return { kind: "failed", message: "Nie udało się połączyć z serwerem pocztowym." };
  }
}
