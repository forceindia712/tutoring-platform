export const MATERIAL_TYPES = [
  { value: "link", label: "Link" },
  { value: "file", label: "Plik (link)" },
  { value: "text", label: "Tekst" },
  { value: "assignment", label: "Zadanie" },
  { value: "note", label: "Notatka" },
] as const;

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  link: "Link",
  file: "Plik (link)",
  text: "Tekst",
  assignment: "Zadanie",
  note: "Notatka",
};
