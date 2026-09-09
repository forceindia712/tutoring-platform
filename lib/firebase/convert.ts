type TimestampLike = {
  toDate?: () => Date;
};

export function toIsoString(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as TimestampLike).toDate === "function"
  ) {
    return (value as TimestampLike).toDate?.().toISOString() ?? null;
  }
  return value;
}

export function hydrateFromFirestore<T>(doc: {
  id: string;
  data: () => Record<string, unknown> | undefined;
}): T {
  const data = doc.data() ?? {};
  const row: Record<string, unknown> = { id: doc.id };
  for (const [key, value] of Object.entries(data)) {
    row[key] = toIsoString(value);
  }
  return row as T;
}
