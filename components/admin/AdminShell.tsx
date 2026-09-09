"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName, cn } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/students", label: "Uczniowie" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            Panel nauczyciela
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonClassName("ghost", "sm"),
                    "rounded-lg",
                    active
                      ? "bg-zinc-100 font-semibold text-zinc-900"
                      : "text-zinc-600",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={buttonClassName("ghost", "sm")}
            >
              {loggingOut ? "Wylogowywanie…" : "Wyloguj"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
