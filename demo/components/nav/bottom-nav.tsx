"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Apple, Heart, LayoutDashboard, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "DASH", icon: LayoutDashboard },
  { href: "/workouts", label: "TRAIN", icon: Activity },
  { href: "/food", label: "FOOD", icon: Apple },
  { href: "/whoop", label: "WHOOP", icon: Heart },
  { href: "/profile", label: "ME", icon: User2 },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[color:var(--black)] border-t border-[color:var(--border)] safe-bottom z-50">
      <div className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const active =
            it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition",
                active
                  ? "text-[color:var(--text-display)]"
                  : "text-[color:var(--text-secondary)]",
              )}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="font-mono text-[10px] tracking-[0.08em]">{it.label}</span>
              {active && (
                <span className="absolute top-0 h-[2px] w-8 bg-[color:var(--text-display)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
