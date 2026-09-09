import Link from "next/link";
import { Card } from "@/components/ui";

export function StudentMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md px-6 py-10 text-center sm:px-10">
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{message}</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Wróć na stronę główną
        </Link>
      </Card>
    </main>
  );
}
