import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AuthError, requireTeacher } from "@/lib/server/auth";
import { isMailConfigured, sendMail } from "@/lib/server/mailer";
import { prepareNotification } from "@/lib/server/notify-data";
import { notificationStateId } from "@/lib/notifications/ids";
import { smsSegments } from "@/lib/notifications/templates";
import type {
  NotificationAudience,
  NotificationChannel,
  NotificationStatus,
} from "@/lib/types";

export const maxDuration = 30;

const LOCK_MS = 60_000;

type Body = {
  channel?: unknown;
  audience?: unknown;
  mode?: unknown;
  attemptKey?: unknown;
  previewHash?: unknown;
  confirmResend?: unknown;
};

function fail(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

function serializeState(data: DocumentData | undefined) {
  if (!data) return null;
  return {
    sendCount: Number(data.send_count ?? 0),
    lastSentAt: data.last_sent_at?.toDate?.().toISOString?.() ?? null,
    lastStatus: (data.last_status as NotificationStatus | null) ?? null,
  };
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireTeacher(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return fail(error.status, "auth", error.message);
    }
    return fail(500, "server", "Błąd serwera.");
  }

  const { id: meetingId } = await ctx.params;
  if (!/^[A-Za-z0-9]{1,64}$/.test(meetingId)) {
    return fail(400, "bad_request", "Nieprawidłowy identyfikator spotkania.");
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail(400, "bad_request", "Nieprawidłowe żądanie.");
  }

  const channel = body.channel as NotificationChannel;
  const audience = body.audience as NotificationAudience;
  const mode = body.mode;
  if (channel !== "email" && channel !== "sms") {
    return fail(400, "bad_request", "Nieprawidłowy kanał.");
  }
  if (audience !== "student" && audience !== "parent") {
    return fail(400, "bad_request", "Nieprawidłowy odbiorca.");
  }
  if (mode !== "preview" && mode !== "send") {
    return fail(400, "bad_request", "Nieprawidłowy tryb.");
  }

  const baseUrl = (
    process.env.APP_BASE_URL?.trim() || new URL(request.url).origin
  ).replace(/\/+$/, "");

  let prepared;
  try {
    prepared = await prepareNotification(meetingId, channel, audience, baseUrl);
  } catch (error) {
    console.error("notify: prepare failed", error);
    return fail(500, "server", "Nie udało się pobrać danych spotkania.");
  }
  if (!prepared) {
    return fail(404, "not_found", "Nie znaleziono spotkania lub ucznia.");
  }

  const stateId = notificationStateId(meetingId, channel, audience);
  const db = getAdminFirestore();
  const stateRef = db.collection("notification_states").doc(stateId);

  const contentHash = sha(
    channel === "email"
      ? `${prepared.email!.subject}\n${prepared.email!.text}\n${prepared.recipient}`
      : `${prepared.smsText}\n${prepared.recipient}`,
  );

  if (mode === "preview") {
    const stateSnap = await stateRef.get();
    return NextResponse.json({
      ok: true,
      recipient: prepared.recipient,
      contentHash,
      homework: prepared.homework
        ? {
            titles: prepared.homework.titles,
            dueDate: prepared.homework.dueDate,
            dueTime: prepared.homework.dueTime,
          }
        : null,
      email: prepared.email,
      sms: prepared.smsText
        ? { text: prepared.smsText, ...smsSegments(prepared.smsText) }
        : null,
      state: stateSnap.exists ? serializeState(stateSnap.data()) : null,
    });
  }

  // ----- mode === "send" -----
  if (!prepared.recipient) {
    return fail(
      422,
      "no_recipient",
      channel === "email"
        ? "Brak poprawnego adresu e-mail odbiorcy."
        : "Brak poprawnego numeru telefonu odbiorcy.",
    );
  }
  if (channel === "email" && !isMailConfigured()) {
    return fail(500, "not_configured", "Poczta nie jest skonfigurowana na serwerze.");
  }

  const attemptKey = typeof body.attemptKey === "string" ? body.attemptKey : "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(attemptKey)) {
    return fail(400, "bad_request", "Brak klucza próby wysyłki.");
  }
  if (body.previewHash !== contentHash) {
    return fail(
      409,
      "content_changed",
      "Treść lub dane odbiorcy zmieniły się od czasu podglądu. Sprawdź podgląd jeszcze raz.",
    );
  }
  const confirmResend = body.confirmResend === true;
  const attemptRef = db
    .collection("notification_attempts")
    .doc(`${stateId}__${attemptKey}`);
  const isManual = channel === "sms";
  const recipient = prepared.recipient;

  type TxResult =
    | { kind: "duplicate"; status: NotificationStatus }
    | { kind: "locked" }
    | { kind: "needs_confirm"; state: DocumentData }
    | { kind: "started"; isResend: boolean };

  const result = await db.runTransaction<TxResult>(async (tx) => {
    const [attemptSnap, stateSnap] = await Promise.all([
      tx.get(attemptRef),
      tx.get(stateRef),
    ]);
    if (attemptSnap.exists) {
      return {
        kind: "duplicate",
        status: attemptSnap.data()?.status as NotificationStatus,
      };
    }
    const state = stateSnap.data();
    const now = Date.now();
    if (!isManual && typeof state?.lock_until === "number" && state.lock_until > now) {
      return { kind: "locked" };
    }
    const sentBefore = (state?.send_count ?? 0) > 0;
    const uncertain = state?.last_status === "unknown";
    if ((sentBefore || uncertain) && !confirmResend) {
      return { kind: "needs_confirm", state: state ?? {} };
    }

    tx.set(attemptRef, {
      meeting_id: meetingId,
      student_id: prepared.meeting.student_id,
      channel,
      audience,
      recipient,
      status: isManual ? "manual" : "pending",
      error: null,
      had_homework: Boolean(prepared.homework),
      is_resend: sentBefore || uncertain,
      content_hash: contentHash,
      created_at: FieldValue.serverTimestamp(),
    });
    tx.set(
      stateRef,
      isManual
        ? {
            meeting_id: meetingId,
            student_id: prepared.meeting.student_id,
            channel,
            audience,
            send_count: FieldValue.increment(1),
            last_sent_at: FieldValue.serverTimestamp(),
            last_status: "manual",
            last_recipient: recipient,
            lock_until: null,
          }
        : {
            meeting_id: meetingId,
            student_id: prepared.meeting.student_id,
            channel,
            audience,
            send_count: state?.send_count ?? 0,
            last_status: "pending",
            last_attempt_at: FieldValue.serverTimestamp(),
            last_recipient: recipient,
            lock_until: now + LOCK_MS,
          },
      { merge: true },
    );
    return { kind: "started", isResend: sentBefore || uncertain };
  });

  if (result.kind === "duplicate") {
    return NextResponse.json({ ok: true, duplicate: true, status: result.status });
  }
  if (result.kind === "locked") {
    return fail(
      409,
      "in_progress",
      "Wysyłka tego powiadomienia jest właśnie w toku (np. w innej karcie). Odczekaj chwilę.",
    );
  }
  if (result.kind === "needs_confirm") {
    return fail(
      409,
      "already_sent",
      "To powiadomienie zostało już wysłane. Potwierdź ponowną wysyłkę.",
      {
        lastSentAt:
          result.state.last_sent_at?.toDate?.().toISOString?.() ?? null,
        sendCount: result.state.send_count ?? 0,
        lastStatus: result.state.last_status ?? null,
      },
    );
  }

  if (isManual) {
    return NextResponse.json({ ok: true, status: "manual" satisfies NotificationStatus });
  }

  // ----- wysyłka e-mail -----
  const mail = await sendMail({
    to: recipient,
    subject: prepared.email!.subject,
    html: prepared.email!.html,
    text: prepared.email!.text,
  });

  if (mail.kind === "accepted") {
    await Promise.all([
      attemptRef.update({
        status: "accepted",
        provider_message_id: mail.messageId,
      }),
      stateRef.update({
        send_count: FieldValue.increment(1),
        last_sent_at: FieldValue.serverTimestamp(),
        last_status: "accepted",
        lock_until: null,
      }),
    ]);
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  const status: NotificationStatus = mail.kind === "unknown" ? "unknown" : "failed";
  await Promise.all([
    attemptRef.update({ status, error: mail.message }),
    stateRef.update({ last_status: status, lock_until: null }),
  ]);
  return fail(status === "unknown" ? 504 : 502, status, mail.message);
}
