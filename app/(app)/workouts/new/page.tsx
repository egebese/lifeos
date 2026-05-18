import { eq, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { programs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { NewWorkoutForm } from "./new-workout-form";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  const { user } = await requireSession();
  const progs = await db
    .select()
    .from(programs)
    .where(or(eq(programs.userId, user.id), isNull(programs.userId)));

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">NEW SESSION</div>
        <h1 className="font-display text-4xl mt-1">start workout</h1>
      </header>
      <Card>
        <CardLabel>PROGRAM</CardLabel>
        <NewWorkoutForm programs={progs} />
      </Card>
    </div>
  );
}
