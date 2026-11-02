"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ErrorNote, SuccessNote, Textarea } from "@/components/ui";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { formatDate } from "@/lib/format";
import { formatPolishPhone } from "@/lib/notifications/phone";
import type { NotificationAudience, NotificationChannel } from "@/lib/types";

type PreviewState = {
  sendCount: number;
  lastSentAt: string | null;
  lastStatus: string | null;
};

type Preview = {
  recipient: string | null;
  contentHash: string;
  homework: { titles: string[]; dueDate: string | null } | null;
  email: { subject: string; html: string; text: string } | null;
  sms: { text: string; length: number; segments: number } | null;
  state: PreviewState | null;
};

type ApiError = {
  ok: false;
  code: string;
  message: string;
  lastSentAt?: string | null;
  sendCount?: number;
  lastStatus?: string | null;
};

export function formatSentAt(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${date.toLocaleDateString("pl-PL")} o ${date.toLocaleTimeString(
    "pl-PL",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

async function callNotify(
  meetingId: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const user = getFirebaseAuthClient().currentUser;
  if (!user) throw new Error("Sesja wygasła. Zaloguj się ponownie.");
  const token = await user.getIdToken();
  const response = await fetch(`/api/meetings/${meetingId}/notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return { status: response.status, data };
}

export function NotifyModal({
  meetingId,
  channel,
  audience,
  onClose,
  onChanged,
}: {
  meetingId: string;
  channel: NotificationChannel;
  audience: NotificationAudience;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Ostrzeżenie z serwera (np. wysłano w innej karcie) – nadpisuje stan z podglądu.
  const [serverState, setServerState] = useState<PreviewState | null>(null);
  const attemptKey = useRef<string>(crypto.randomUUID());
  const sendLock = useRef(false);

  const fetchPreview = useCallback(async () => {
    try {
      const { status, data } = await callNotify(meetingId, {
        channel,
        audience,
        mode: "preview",
      });
      if (status !== 200 || data.ok !== true) {
        return {
          preview: null,
          error:
            typeof data.message === "string"
              ? data.message
              : "Nie udało się przygotować podglądu.",
        };
      }
      return { preview: data as unknown as Preview, error: null };
    } catch (err) {
      return {
        preview: null,
        error: err instanceof Error ? err.message : "Błąd połączenia.",
      };
    }
  }, [meetingId, channel, audience]);

  function applyPreview(result: { preview: Preview | null; error: string | null }) {
    setPreview(result.preview);
    setError(result.error);
    if (result.preview) setServerState(null);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void fetchPreview().then((result) => {
      if (active) applyPreview(result);
    });
    return () => {
      active = false;
    };
  }, [fetchPreview]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const state = serverState ?? preview?.state ?? null;
  const needsConfirm =
    Boolean(state) &&
    ((state?.sendCount ?? 0) > 0 || state?.lastStatus === "unknown");
  const isEmail = channel === "email";
  const audienceLabel = audience === "student" ? "ucznia" : "rodzica";
  const canSend = Boolean(preview?.recipient) && !done;

  async function submit() {
    if (!preview || sendLock.current) return;
    sendLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const { data } = await callNotify(meetingId, {
        channel,
        audience,
        mode: "send",
        attemptKey: attemptKey.current,
        previewHash: preview.contentHash,
        confirmResend: needsConfirm,
      });
      if (data.ok === true) {
        setDone(
          data.duplicate
            ? "Ta wysyłka została już zarejestrowana."
            : isEmail
              ? "E-mail został przyjęty przez serwer pocztowy do wysłania."
              : "Zapisano, że SMS został wysłany.",
        );
        onChanged();
      } else {
        const failure = data as unknown as ApiError;
        setError(failure.message ?? "Nie udało się wysłać.");
        // Po jednoznacznym wyniku kolejna próba dostaje nowy klucz.
        attemptKey.current = crypto.randomUUID();
        if (failure.code === "already_sent") {
          setServerState({
            sendCount: failure.sendCount ?? 1,
            lastSentAt: failure.lastSentAt ?? null,
            lastStatus: failure.lastStatus ?? null,
          });
        }
        if (failure.code === "content_changed") applyPreview(await fetchPreview());
        onChanged();
      }
    } catch (err) {
      // Brak odpowiedzi: klucz próby zostaje, więc ponowienie nie zdubluje wysyłki.
      setError(
        err instanceof Error
          ? `${err.message} Sprawdź historię, zanim spróbujesz ponownie.`
          : "Błąd połączenia.",
      );
    }
    sendLock.current = false;
    setBusy(false);
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Nie udało się skopiować. Zaznacz tekst ręcznie.");
    }
  }

  const homeworkInfo = preview?.homework
    ? preview.homework.dueDate
      ? `Tak, termin oddania: ${formatDate(preview.homework.dueDate)}`
      : "Tak, bez terminu oddania"
    : "Nie";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Podgląd powiadomienia"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          {isEmail ? "E-mail" : "SMS"} do {audienceLabel}
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Przygotowywanie podglądu…</p>
        ) : null}

        {preview ? (
          <div className="mt-4 space-y-4">
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[130px_1fr]">
              <dt className="text-zinc-500">Odbiorca</dt>
              <dd className="font-medium text-zinc-900">
                {preview.recipient
                  ? isEmail
                    ? preview.recipient
                    : formatPolishPhone(preview.recipient)
                  : "—"}
              </dd>
              <dt className="text-zinc-500">Praca domowa</dt>
              <dd className="text-zinc-900">{homeworkInfo}</dd>
            </dl>

            {!preview.recipient ? (
              <ErrorNote>
                {isEmail
                  ? `Brak poprawnego adresu e-mail ${audienceLabel}. Uzupełnij go w profilu ucznia.`
                  : `Brak poprawnego numeru telefonu ${audienceLabel}. Uzupełnij go w profilu ucznia.`}
              </ErrorNote>
            ) : null}

            {needsConfirm && !done ? (
              <div
                role="alert"
                className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <p className="font-semibold">Uwaga!</p>
                <p className="mt-1">
                  {state?.lastStatus === "unknown"
                    ? `Poprzednia próba wysłania ${
                        isEmail ? "e-maila" : "SMS-a"
                      } miała niepewny wynik (${formatSentAt(
                        state?.lastSentAt ?? null,
                      )}). Wiadomość mogła zostać wysłana. Czy na pewno chcesz wysłać ją ponownie?`
                    : `Powiadomienie ${
                        isEmail ? "e-mail" : "SMS"
                      } dotyczące tego spotkania zostało już wysłane ${formatSentAt(
                        state?.lastSentAt ?? null,
                      )} (łącznie ${state?.sendCount ?? 1}×). Czy na pewno chcesz wysłać je ponownie?`}
                </p>
              </div>
            ) : null}

            {isEmail && preview.email ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-500">
                  Temat:{" "}
                  <span className="font-medium text-zinc-900">
                    {preview.email.subject}
                  </span>
                </p>
                <iframe
                  title="Podgląd e-maila"
                  sandbox=""
                  srcDoc={preview.email.html}
                  className="h-[420px] w-full rounded-lg border border-zinc-200 bg-zinc-100"
                />
              </div>
            ) : null}

            {!isEmail && preview.sms ? (
              <div className="space-y-3">
                <Textarea
                  readOnly
                  rows={5}
                  value={preview.sms.text}
                  aria-label="Treść SMS-a"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <p className="text-xs text-zinc-500">
                  {preview.sms.length} znaków · {preview.sms.segments}{" "}
                  {preview.sms.segments === 1 ? "SMS" : "SMS-y"} · bez polskich
                  znaków (unikamy kodowania Unicode, które skraca SMS do 70
                  znaków).
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void copy("text", preview.sms!.text)}
                  >
                    {copied === "text" ? "Skopiowano ✓" : "Kopiuj treść"}
                  </Button>
                  {preview.recipient ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void copy("phone", preview.recipient!)}
                    >
                      {copied === "phone" ? "Skopiowano ✓" : "Kopiuj numer"}
                    </Button>
                  ) : null}
                  {preview.recipient ? (
                    <a
                      href={`sms:${preview.recipient}?body=${encodeURIComponent(
                        preview.sms.text,
                      )}`}
                      className="inline-flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      Otwórz w aplikacji SMS
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500">
                  Wyślij SMS-a z własnego telefonu, a potem potwierdź poniżej.
                  Aplikacja nie ma jak sprawdzić, czy wiadomość faktycznie
                  wyszła.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        ) : null}
        {done ? (
          <div className="mt-4">
            <SuccessNote>{done}</SuccessNote>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {done ? "Zamknij" : "Anuluj"}
          </Button>
          {!done ? (
            <Button
              variant={needsConfirm ? "danger" : "primary"}
              onClick={() => void submit()}
              disabled={!canSend || busy || loading}
            >
              {busy
                ? "Zapisywanie…"
                : isEmail
                  ? needsConfirm
                    ? "Wyślij ponownie"
                    : "Wyślij e-mail"
                  : needsConfirm
                    ? "Wysłałem ponownie ✓"
                    : "Wysłałem SMS ✓"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
