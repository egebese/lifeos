import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, isNull, sql } from "drizzle-orm";
import { exercises, programs, programDays, programExercises } from "../lib/db/schema";

// 3x/week full-body — six compound movement patterns
const TEMPLATE = {
  name: "Full Body — 3 / Week",
  description:
    "Six compound patterns over three sessions: vertical pull, squat, horizontal push, vertical push, horizontal pull, hinge.",
  days: [
    {
      name: "Day A — Pull / Squat / Push",
      patterns: [
        { target: "pull-ups", search: "pull-up", sets: 4, reps: 6 },
        { target: "squat", search: "barbell squat", sets: 4, reps: 6 },
        { target: "bench press", search: "barbell bench press", sets: 4, reps: 6 },
      ],
    },
    {
      name: "Day B — Press / Row / Hinge",
      patterns: [
        {
          target: "overhead press",
          search: "barbell seated overhead press",
          sets: 4,
          reps: 6,
        },
        { target: "barbell row", search: "barbell bent over row", sets: 4, reps: 8 },
        { target: "deadlift", search: "barbell deadlift", sets: 3, reps: 5 },
      ],
    },
    {
      name: "Day C — Mixed",
      patterns: [
        { target: "pull-ups", search: "pull-up", sets: 3, reps: 8 },
        { target: "squat", search: "barbell squat", sets: 3, reps: 8 },
        { target: "bench press", search: "barbell bench press", sets: 3, reps: 8 },
        { target: "barbell row", search: "barbell bent over row", sets: 3, reps: 10 },
      ],
    },
  ],
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const existing = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.name, TEMPLATE.name), eq(programs.isTemplate, true)));
  if (existing.length > 0) {
    console.log(`→ template "${TEMPLATE.name}" already exists; skipping`);
    await pool.end();
    return;
  }

  // Make sure exercises are present
  const ex = await db.select({ id: exercises.id }).from(exercises).limit(1);
  if (ex.length === 0) {
    console.warn("→ exercises table empty; run seed:exercises first. skipping templates.");
    await pool.end();
    return;
  }

  const [prog] = await db
    .insert(programs)
    .values({
      userId: null,
      name: TEMPLATE.name,
      description: TEMPLATE.description,
      isTemplate: true,
    })
    .returning({ id: programs.id });

  for (let d = 0; d < TEMPLATE.days.length; d++) {
    const day = TEMPLATE.days[d];
    const [dayRow] = await db
      .insert(programDays)
      .values({ programId: prog.id, dayIndex: d, name: day.name })
      .returning({ id: programDays.id });

    for (let i = 0; i < day.patterns.length; i++) {
      const p = day.patterns[i];
      // Pick first exercise matching name LIKE
      const match = await db.execute<{ id: string }>(
        sql`select id from exercises where lower(name_en) like ${`%${p.search.toLowerCase()}%`} order by id limit 1`,
      );
      const exId = match.rows[0]?.id;
      if (!exId) {
        console.warn(`  no exercise match for "${p.search}", skipping`);
        continue;
      }
      await db.insert(programExercises).values({
        programDayId: dayRow.id,
        exerciseId: exId,
        orderIndex: i,
        targetSets: p.sets,
        targetReps: p.reps,
      });
    }
  }

  console.log(`✓ seeded template "${TEMPLATE.name}"`);
  await pool.end();
}

main().catch((e) => {
  console.error("seed-templates failed:", e);
  process.exit(1);
});
