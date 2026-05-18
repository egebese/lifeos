import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { workouts, workoutSets } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const { user } = await requireSession();

  const recent = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, user.id))
    .orderBy(desc(workouts.startedAt))
    .limit(50);

  // Per-workout set count
  const counts = new Map<string, number>();
  if (recent.length > 0) {
    const setsRows = await db.select().from(workoutSets);
    for (const s of setsRows) {
      counts.set(s.workoutId, (counts.get(s.workoutId) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">HISTORY</div>
          <h1 className="font-display text-4xl mt-1">workouts</h1>
        </div>
        <Link href="/workouts/new">
          <Button>+ NEW</Button>
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Link href="/programs" className="border border-[color:var(--border-visible)] py-4 px-4 font-mono text-[11px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]">
          PROGRAMS →
        </Link>
        <Link href="/workouts/exercises" className="border border-[color:var(--border-visible)] py-4 px-4 font-mono text-[11px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]">
          EXERCISE LIBRARY (1324) →
        </Link>
      </div>

      <section className="space-y-1">
        {recent.length === 0 ? (
          <Card>
            <div className="font-mono text-sm text-[color:var(--text-secondary)] py-8 text-center">
              no workouts yet —{" "}
              <Link href="/workouts/new" className="text-[color:var(--accent)]">
                start one
              </Link>
            </div>
          </Card>
        ) : (
          recent.map((w) => {
            const setCount = counts.get(w.id) ?? 0;
            return (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 border-b border-[color:var(--border)] hover:bg-[color:var(--surface)]"
              >
                <div>
                  <div className="font-mono text-sm text-[color:var(--text-display)]">
                    {new Date(w.startedAt).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mono-label mt-0.5">
                    {w.endedAt ? "COMPLETED" : "IN PROGRESS"}
                  </div>
                </div>
                <div className="font-mono text-sm text-[color:var(--text-secondary)]">
                  {setCount} sets
                </div>
                <div className="font-mono text-[11px] text-[color:var(--text-secondary)]">→</div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
