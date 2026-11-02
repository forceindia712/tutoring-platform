"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { NotifyModal, formatSentAt } from "@/components/admin/NotifyModal";
import {
  listNotificationAttempts,
  listNotificationStates,
} from "@/lib/firebase/clientDb";
import { normalizePolishPhone } from "@/lib/notifications/phone";
import { notificationStateId } from "@/lib/notifications/ids";
import type {
  NotificationAttempt,
  NotificationAudience,
  NotificationChannel,
  NotificationState,
  Student,
} from "@/lib/types";

const STALE_PENDING_MS = 2 * 60_000;

function effectiveStatus(
  state: NotificationState | undefined,
): NotificationState["last_status"] {
  if (!state) return null;
  if (state.last_status === "pending") {
    const startedAt = state.last_attempt_at ?? state.last_sent_at;
    const stale =
      !startedAt || Date.now() - new Date(startedAt).getTime() > STALE_PENDING_MS;
    return stale ? "unknown" : "pending";
  }
  return state.last_status;
}

function buttonLabel(
  channel: NotificationChannel,
  state: NotificationState | undefined,
): string {
  const noun = channel === "email" ? "e-mail" : "SMS";
  const status = effectiveStatus(state);
  if (status === "pending") return `Wysyłanie ${noun}…`;
  if (status === "failed") return `${noun === "SMS" ? "SMS" : "E-mail"} – błąd, ponów`;
  if (status === "unknown") return `${noun === "SMS" ? "SMS" : "E-mail"} – wynik niepewny`;
  if ((state?.send_count ?? 0) > 0) {
    return channel === "email" ? "E-mail wysłany ✓" : "SMS wysłany ✓";
  }
  return channel === "email" ? "Wyślij e-mail" : "Wyślij SMS";
}

const STATUS_TEXT: Record<string, string> = {
  pending: "w toku",
  accepted: "przyjęty przez serwer pocztowy",
  manual: "potwierdzone ręcznie",
  failed: "błąd",
  unknown: "wynik niepewny",
};

export function NotifyCard({
  meetingId,
  student,
}: {
  meetingId: string;
  student: Student | null;
}) {
  const [states, setStates] = useState<NotificationState[]>([]);
  const [attempts, setAttempts] = useState<NotificationAttempt[]>([]);
  const [modal, setModal] = useState<{
    channel: NotificationChannel;
    audience: NotificationAudience;
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [nextStates, nextAttempts] = await Promise.all([
        listNotificationStates(meetingId),
        listNotificationAttempts(meetingId),
      ]);
      return { nextStates, nextAttempts };
    } catch {
      return null;
    }
  }, [meetingId]);

  const applyAll = useCallback(
    (result: Awaited<ReturnType<typeof fetchAll>>) => {
      if (!result) {
        setLoadError(true);
        return;
      }
      setStates(result.nextStates);
      setAttempts(result.nextAttempts);
      setLoadError(false);
    },
    [],
  );

  const refresh = useCallback(async () => {
    applyAll(await fetchAll());
  }, [applyAll, fetchAll]);

  useEffect(() => {
    let active = true;
    void fetchAll().then((result) => {
      if (active) applyAll(result);
    });
    return () => {
      active = false;
    };
  }, [fetchAll, applyAll]);

  if (!student) return null;

  const contacts: Record<
    NotificationAudience,
    { email: string | null; phone: string | null }
  > = {
    student: {
      email: student.email?.trim() || null,
      phone: normalizePolishPhone(student.phone),
    },
    parent: {
      email: student.parent_email?.trim() || null,
      phone: normalizePolishPhone(student.parent_phone),
    },
  };

  function renderRow(audience: NotificationAudience, title: string) {
    const contact = contacts[audience];
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        {(["email", "sms"] as const).map((channel) => {
          const state = states.find(
            (item) => item.id === notificationStateId(meetingId, channel, audience),
          );
          const target = channel === "email" ? contact.email : contact.phone;
          const status = effectiveStatus(state);
          return (
            <div key={channel}>
              <Button
                variant={
                  status === "failed" || status === "unknown"
                    ? "danger"
                    : (state?.send_count ?? 0) > 0
                      ? "secondary"
                      : "primary"
                }
                size="sm"
                className="w-full"
                disabled={!target || status === "pending"}
                onClick={() => setModal({ channel, audience })}
              >
                {buttonLabel(channel, state)}
              </Button>
              <p className="mt-1 text-xs text-zinc-500">
                {!target
                  ? channel === "email"
                    ? "Brak adresu e-mail – uzupełnij w profilu ucznia."
                    : "Brak numeru telefonu – uzupełnij w profilu ucznia."
                  : state && state.last_status
                    ? `${
                        state.last_sent_at
                          ? formatSentAt(state.last_sent_at)
                          : "Ostatnia próba"
                      } · ${state.send_count}× · ${
                        STATUS_TEXT[status ?? ""] ?? ""
                      }`
                    : target}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Powiadomienia
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Wiadomość odzwierciedla aktualny stan spotkania w chwili wysyłki.
      </p>

      <div className="mt-4 space-y-5">
        {renderRow("student", "Uczeń")}
        {renderRow("parent", "Rodzic / opiekun")}
      </div>

      {loadError ? (
        <p className="mt-3 text-xs text-red-600">
          Nie udało się wczytać statusów wysyłek.
        </p>
      ) : null}

      <button
        type="button"
        className="mt-4 text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900"
        onClick={() => setShowHistory((current) => !current)}
      >
        {showHistory ? "Ukryj historię" : `Historia wysyłek (${attempts.length})`}
      </button>

      {showHistory ? (
        <ul className="mt-3 space-y-2">
          {attempts.length === 0 ? (
            <li className="text-xs text-zinc-500">Brak wysyłek.</li>
          ) : null}
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
            >
              <span className="font-medium">
                {attempt.channel === "email" ? "E-mail" : "SMS"} ·{" "}
                {attempt.audience === "student" ? "uczeń" : "rodzic"}
              </span>{" "}
              · {STATUS_TEXT[attempt.status] ?? attempt.status}
              {attempt.is_resend ? " · ponownie" : ""}
              <br />
              {formatSentAt(attempt.created_at)} · {attempt.recipient}
              {attempt.error ? (
                <>
                  <br />
                  <span className="text-red-600">{attempt.error}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {modal ? (
        <NotifyModal
          meetingId={meetingId}
          channel={modal.channel}
          audience={modal.audience}
          onClose={() => {
            setModal(null);
            void refresh();
          }}
          onChanged={() => void refresh()}
        />
      ) : null}
    </Card>
  );
}
