"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import type { Student } from "@/lib/types";

export function StudentLink({ student }: { student: Student }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setOrigin(window.location.origin);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const url = `${origin}/s/${student.student_access_token}`;

  async function copyLink() {
    if (!origin) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Indywidualny link ucznia
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={origin ? url : "…"}
          aria-label="Link ucznia"
          className="bg-white font-mono text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={copyLink}
          disabled={!origin}
          className="shrink-0"
        >
          {copied ? "Skopiowano ✓" : "Kopiuj link ucznia"}
        </Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Wyślij ten link uczniowi — od razu zobaczy swoje spotkania.
      </p>
    </div>
  );
}
