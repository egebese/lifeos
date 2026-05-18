"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Apple,
  BarChart3,
  Calendar,
  Heart,
  LayoutDashboard,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useDemoStore } from "@/lib/demo/store";

const SECTIONS = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analysis", label: "Analysis", icon: BarChart3 },
    ],
  },
  {
    title: "TRAIN",
    items: [
      { href: "/workouts", label: "Workouts", icon: Activity },
      { href: "/programs", label: "Programs", icon: Calendar },
    ],
  },
  {
    title: "EAT",
    items: [
      { href: "/food", label: "Food Log", icon: Apple },
      { href: "/food/plan", label: "Meal Plan", icon: Sparkles },
      { href: "/pantry", label: "Pantry", icon: ShoppingCart },
      { href: "/preferences", label: "Preferences", icon: Apple },
    ],
  },
  {
    title: "DATA",
    items: [
      { href: "/whoop", label: "Whoop", icon: Heart },
      { href: "/profile", label: "Profile", icon: User2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { reset } = useDemoStore();
  return (
    <aside className="hidden md:flex md:flex-col w-64 border-r border-[color:var(--border)] bg-[color:var(--black)] sticky top-0 h-dvh">
      <div className="p-6 border-b border-[color:var(--border)]">
        <div className="mono-label">LIFETRACKER / V1</div>
        <div className="font-display text-2xl mt-2">LifeOS</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <div className="mono-label px-3 mb-2">{sec.title}</div>
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const active =
                  it.href === "/"
                    ? pathname === "/"
                    : pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm transition",
                        active
                          ? "text-[color:var(--text-display)] bg-[color:var(--surface-raised)]"
                          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]",
                      )}
                    >
                      <Icon size={16} strokeWidth={1.5} />
                      <span>{it.label}</span>
                      {active && (
                        <span className="ml-auto w-1 h-4 bg-[color:var(--accent)]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[color:var(--border)]">
        <div className="px-3 py-2">
          <ThemeToggle />
        </div>
        <div className="p-3 border-t border-[color:var(--border)]">
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset demo data to defaults? Your edits in this browser will be lost.")) {
                reset();
              }
            }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] w-full"
          >
            <RefreshCw size={16} strokeWidth={1.5} />
            <span>Reset demo</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
