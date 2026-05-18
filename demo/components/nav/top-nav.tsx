"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useDemoStore } from "@/lib/demo/store";

type Item = { href: string; label: string };

const NAV: Item[] = [
  { href: "/", label: "Dashboard" },
  { href: "/workouts", label: "Workouts" },
  { href: "/programs", label: "Programs" },
  { href: "/food", label: "Food" },
  { href: "/food/plan", label: "Meal Plan" },
  { href: "/pantry", label: "Pantry" },
  { href: "/whoop", label: "Whoop" },
  { href: "/analysis", label: "Analysis" },
  { href: "/profile", label: "Profile" },
];

function pickActive(pathname: string): string | null {
  // Longest matching href wins so /food/plan activates "Meal Plan", not "Food".
  let best: string | null = null;
  for (const it of NAV) {
    const match =
      it.href === "/"
        ? pathname === "/"
        : pathname === it.href || pathname.startsWith(it.href + "/");
    if (!match) continue;
    if (!best || it.href.length > best.length) best = it.href;
  }
  return best;
}

export function TopNav() {
  const pathname = usePathname();
  const active = pickActive(pathname);
  const { reset } = useDemoStore();

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--black)]/95 backdrop-blur safe-top">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center gap-10 h-14">
          <Link
            href="/"
            className="font-display text-2xl text-[color:var(--text-display)] leading-none shrink-0"
            aria-label="LifeOS — home"
          >
            LifeOS
          </Link>

          <nav className="flex-1 min-w-0">
            <ul className="flex items-center gap-1">
              {NAV.map((it) => {
                const isActive = active === it.href;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative inline-flex items-center px-3 h-14 font-body text-[13px] whitespace-nowrap transition-colors",
                        isActive
                          ? "text-[color:var(--text-display)]"
                          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]",
                      )}
                    >
                      {it.label}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-3 right-3 bottom-0 h-px transition-colors",
                          isActive ? "bg-[color:var(--accent)]" : "bg-transparent",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                if (confirm("Reset demo data to defaults? Your edits in this browser will be lost.")) {
                  reset();
                }
              }}
              aria-label="Reset demo data"
              title="Reset demo data"
              className="inline-flex items-center justify-center w-10 h-10 text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] transition-colors"
            >
              <RefreshCw size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
