// Normalizacja polskich numerów telefonu do postaci +48XXXXXXXXX.
// Zwraca null, jeśli numer nie wygląda na poprawny.
export function normalizePolishPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0048")) digits = digits.slice(4);
  else if (digits.startsWith("48") && digits.length === 11) digits = digits.slice(2);
  if (!/^[1-9]\d{8}$/.test(digits)) return null;
  return `+48${digits}`;
}

export function formatPolishPhone(normalized: string): string {
  const d = normalized.replace(/^\+48/, "");
  return `+48 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function maskPhone(normalized: string): string {
  return `+48 *** *** ${normalized.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}
