import { Card } from "@/components/ui";
import { MATERIAL_TYPE_LABELS } from "@/lib/constants";
import type { MaterialWithFileUrl } from "@/lib/data/student";

type MaterialCardProps = {
  material: MaterialWithFileUrl;
  index: number;
};

function actionForMaterial(material: MaterialWithFileUrl) {
  if (material.type === "link" && material.url) {
    return (
      <a
        href={material.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
      >
        Otwórz materiał
      </a>
    );
  }

  if (material.type === "file") {
    if (material.download_url) {
      return (
        <a
          href={material.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
        >
          Pobierz plik
        </a>
      );
    }
    return <span className="text-sm text-zinc-400">Plik niedostępny</span>;
  }

  return null;
}

export function MaterialCard({ material, index }: MaterialCardProps) {
  const showContent =
    material.type === "text" ||
    material.type === "assignment" ||
    material.type === "note";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-zinc-400">
              {index}.
            </span>
            <h3 className="font-semibold text-zinc-900">{material.title}</h3>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              {MATERIAL_TYPE_LABELS[material.type] ?? material.type}
            </span>
          </div>

          {material.description ? (
            <p
              className={`mt-2 text-sm leading-6 text-zinc-600 ${
                showContent ? "whitespace-pre-wrap" : ""
              }`}
            >
              {material.description}
            </p>
          ) : null}
        </div>

        {actionForMaterial(material) ? (
          <div className="shrink-0 sm:pt-6">{actionForMaterial(material)}</div>
        ) : null}
      </div>
    </Card>
  );
}
