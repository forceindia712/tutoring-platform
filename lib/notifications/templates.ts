import { formatDate } from "@/lib/format";
import type { NotificationAudience } from "@/lib/types";

export type Homework = {
  titles: string[];
  // Najwcześniejszy termin spośród zadań, które go mają (YYYY-MM-DD).
  dueDate: string | null;
};

export type MessageContext = {
  audience: NotificationAudience;
  studentFirstName: string;
  studentFullName: string;
  parentName: string | null;
  meetingDate: string;
  homework: Homework | null;
  link: string;
};

export type EmailContent = { subject: string; html: string; text: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
}

const POLISH_MAP: Record<string, string> = {
  ł: "l",
  Ł: "L",
  ą: "a",
  Ą: "A",
  ć: "c",
  Ć: "C",
  ę: "e",
  Ę: "E",
  ń: "n",
  Ń: "N",
  ó: "o",
  Ó: "O",
  ś: "s",
  Ś: "S",
  ź: "z",
  Ź: "Z",
  ż: "z",
  Ż: "Z",
};

// Polskie litery wymuszają kodowanie UCS-2 (70 znaków na SMS zamiast 160),
// dlatego SMS przygotowujemy bez nich.
export function toGsmSafe(value: string): string {
  return value
    .replace(/[łŁąĄćĆęĘńŃóÓśŚźŹżŻ]/g, (char) => POLISH_MAP[char] ?? char)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "");
}

export function smsSegments(text: string): { length: number; segments: number } {
  const length = text.length;
  if (length === 0) return { length, segments: 0 };
  return { length, segments: length <= 160 ? 1 : Math.ceil(length / 153) };
}

export function buildSmsText(ctx: MessageContext): string {
  const date = shortDate(ctx.meetingDate);
  const first = toGsmSafe(ctx.studentFirstName);
  const due = ctx.homework?.dueDate ? shortDate(ctx.homework.dueDate) : null;

  if (ctx.audience === "parent") {
    const head = `Dzien dobry! W panelu zajec (${first}) sa materialy ze spotkania ${date}.`;
    const hw = ctx.homework
      ? due
        ? ` Jest tez praca domowa (do ${due}).`
        : " Jest tez praca domowa."
      : "";
    return `${head}${hw} Link: ${ctx.link}`;
  }

  if (!ctx.homework) {
    return `Czesc ${first}! W panelu dodano materialy ze spotkania ${date}. Zapoznaj sie z nimi: ${ctx.link}`;
  }
  const hw = due ? `Masz tez prace domowa (do ${due}).` : "Masz tez prace domowa.";
  return `Czesc ${first}! Materialy ze spotkania ${date} sa w panelu. ${hw} Sprawdz: ${ctx.link}`;
}

export function buildEmail(ctx: MessageContext): EmailContent {
  const isParent = ctx.audience === "parent";
  const dateLong = formatDate(ctx.meetingDate);
  const dueLong = ctx.homework?.dueDate ? formatDate(ctx.homework.dueDate) : null;

  const subject = isParent
    ? `Nowe materiały ze spotkania – ${ctx.studentFirstName}, ${dateLong}`
    : `Nowe materiały ze spotkania – ${dateLong}`;

  const greeting = isParent
    ? ctx.parentName
      ? `Dzień dobry, ${ctx.parentName},`
      : "Dzień dobry,"
    : `Cześć ${ctx.studentFirstName}!`;

  const intro = isParent
    ? `W panelu zajęć pojawiły się informacje i materiały dotyczące spotkania z dnia ${dateLong} (dotyczy: ${ctx.studentFullName}).`
    : `W Twoim panelu ucznia pojawiły się informacje i materiały dotyczące spotkania z dnia ${dateLong}.`;

  const ask = isParent
    ? "Zachęcam do zapoznania się z nimi razem z dzieckiem."
    : "Zachęcam Cię do zapoznania się z materiałami i notatkami.";

  const hwLead = isParent
    ? "Do spotkania została dodana praca domowa. Proszę o przypomnienie dziecku o jej wykonaniu."
    : "Do spotkania została dodana praca domowa. Pamiętaj o jej wykonaniu!";

  const closing = isParent
    ? "Pozdrawiam serdecznie"
    : "Do zobaczenia na kolejnych zajęciach!";

  const hwTitles = ctx.homework?.titles ?? [];

  // ----- wersja tekstowa -----
  const textLines = [greeting, "", intro, ask, "", `Zobacz spotkanie: ${ctx.link}`];
  if (ctx.homework) {
    textLines.push("", "PRACA DOMOWA", hwLead);
    if (dueLong) textLines.push(`Termin oddania: ${dueLong}`);
    for (const title of hwTitles) textLines.push(`- ${title}`);
    textLines.push("Szczegóły zadania znajdziesz w materiałach spotkania.");
  }
  textLines.push("", closing);
  const text = textLines.join("\n");

  // ----- wersja HTML (tabele + inline CSS, kompatybilne z klientami poczty) -----
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const homeworkBlock = ctx.homework
    ? `
      <tr><td style="padding:8px 32px 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;">
          <tr><td style="padding:18px 20px;font-family:${font};">
            <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;letter-spacing:.08em;color:#b45309;">&#128218; PRACA DOMOWA</p>
            <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;color:#27272a;">${escapeHtml(hwLead)}</p>
            ${
              dueLong
                ? `<p style="margin:0 0 10px 0;font-size:16px;font-weight:700;color:#92400e;">Termin oddania: ${escapeHtml(dueLong)}</p>`
                : ""
            }
            ${
              hwTitles.length > 0
                ? `<ul style="margin:0 0 10px 18px;padding:0;font-size:14px;line-height:1.6;color:#3f3f46;">${hwTitles
                    .map((title) => `<li>${escapeHtml(title)}</li>`)
                    .join("")}</ul>`
                : ""
            }
            <p style="margin:0;font-size:14px;line-height:1.6;color:#52525b;">Szczegóły zadania znajdziesz w materiałach spotkania.</p>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#18181b;padding:20px 32px;font-family:${font};font-size:18px;font-weight:600;color:#ffffff;">Zajęcia</td></tr>
      <tr><td style="padding:28px 32px 8px 32px;font-family:${font};">
        <p style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#3f3f46;">${escapeHtml(intro)}</p>
        <p style="margin:0 0 4px 0;font-size:15px;line-height:1.7;color:#3f3f46;">${escapeHtml(ask)}</p>
      </td></tr>
      <tr><td align="left" style="padding:16px 32px 24px 32px;">
        <a href="${escapeHtml(ctx.link)}" style="display:inline-block;background:#18181b;color:#ffffff;font-family:${font};font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;">Zobacz spotkanie</a>
      </td></tr>
      ${homeworkBlock}
      <tr><td style="padding:24px 32px 8px 32px;font-family:${font};font-size:15px;line-height:1.7;color:#3f3f46;">${escapeHtml(closing)}</td></tr>
      <tr><td style="padding:16px 32px 28px 32px;font-family:${font};font-size:12px;line-height:1.6;color:#a1a1aa;">Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:<br><span style="word-break:break-all;color:#71717a;">${escapeHtml(ctx.link)}</span></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}
