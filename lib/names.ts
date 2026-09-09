export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function normalizedFullName(
  firstName: string,
  lastName: string,
): string {
  return normalizeName(`${firstName} ${lastName}`);
}
