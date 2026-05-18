import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { foodPreferences } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { PreferencesEditor } from "./preferences-editor";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const { user } = await requireSession();
  const prefs = await db
    .select()
    .from(foodPreferences)
    .where(eq(foodPreferences.userId, user.id));

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">TASTE PROFILE</div>
        <h1 className="font-display text-4xl mt-1">preferences</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["liked", "disliked", "allergy"] as const).map((kind) => (
          <Card key={kind}>
            <CardLabel>{kind.toUpperCase()}</CardLabel>
            <PreferencesEditor
              kind={kind}
              initial={prefs.filter((p) => p.kind === kind).map((p) => ({ id: p.id, label: p.label }))}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
