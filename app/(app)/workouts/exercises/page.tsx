import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { exercises } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { ExerciseLibrary } from "./exercise-library";

export const dynamic = "force-dynamic";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; body_part?: string }>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const bodyPart = (sp.body_part ?? "").trim();

  const rows = await db
    .select()
    .from(exercises)
    .where(
      q || bodyPart
        ? sql`
            (${q ? sql`lower(name_en) like ${`%${q.toLowerCase()}%`}` : sql`true`})
            and (${bodyPart ? sql`body_part = ${bodyPart}` : sql`true`})
          `
        : undefined,
    )
    .orderBy(exercises.id)
    .limit(60);

  const bodyParts = await db
    .select({ bodyPart: exercises.bodyPart })
    .from(exercises)
    .groupBy(exercises.bodyPart);

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">LIBRARY · 1324 EXERCISES</div>
        <h1 className="font-display text-4xl mt-1">exercises</h1>
      </header>

      <form className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <div className="mono-label mb-1">SEARCH</div>
          <input
            name="q"
            defaultValue={q}
            placeholder="bench press, squat…"
            className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-3 px-1 font-body text-base text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
          />
        </div>
        <div>
          <div className="mono-label mb-1">BODY PART</div>
          <select
            name="body_part"
            defaultValue={bodyPart}
            className="bg-transparent border-b border-[color:var(--border-visible)] py-3 px-1 font-body text-base text-[color:var(--text-display)]"
          >
            <option value="">all</option>
            {bodyParts
              .filter((b) => b.bodyPart)
              .map((b) => (
                <option key={b.bodyPart!} value={b.bodyPart!}>
                  {b.bodyPart}
                </option>
              ))}
          </select>
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          FILTER →
        </button>
      </form>

      <ExerciseLibrary
        locale="en"
        rows={rows.map((ex) => ({
          id: ex.id,
          nameEn: ex.nameEn,
          nameTr: ex.nameTr,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          target: ex.target,
          muscleGroup: ex.muscleGroup,
          secondaryMuscles: (ex.secondaryMuscles as string[] | null) ?? null,
          instructionsEn: ex.instructionsEn,
          instructionsTr: ex.instructionsTr,
          instructionStepsEn: (ex.instructionStepsEn as string[] | null) ?? null,
          instructionStepsTr: (ex.instructionStepsTr as string[] | null) ?? null,
          imageUrl: ex.imageUrl,
          gifUrl: ex.gifUrl,
        }))}
      />
    </div>
  );
}
