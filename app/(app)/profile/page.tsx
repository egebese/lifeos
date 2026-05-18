import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { bmi, bmiCategory, bmr, recommendedKcal, tdee, macroSplit } from "@/lib/nutrition";
import { getMeasuredTdee } from "@/lib/whoop/tdee";
import { Card, CardLabel } from "@/components/ui/card";
import { MonoStat } from "@/components/nothing/mono-stat";
import { resolveDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user } = await requireSession();
  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id)).limit(1);
  const name = resolveDisplayName({ displayName: p?.displayName, email: user.email });

  const w = Number(p?.weightKg ?? 0);
  const h = Number(p?.heightCm ?? 0);
  const age = p?.age ?? 0;
  const sex = p?.sex ?? "m";
  const activity = p?.activityLevel ?? "moderate";
  const goal = p?.goal ?? "maintain";

  const b = w && h ? bmi(w, h) : 0;
  const bm = w && h && age ? bmr({ sex, weightKg: w, heightCm: h, age }) : 0;
  const formulaTd = bm ? tdee(bm, activity) : 0;
  const measured = await getMeasuredTdee(user.id);
  const td = measured?.kcal ?? formulaTd;
  const tdeeSource: "whoop" | "formula" = measured ? "whoop" : "formula";
  const target = td ? Math.round(recommendedKcal(td, goal)) : 0;
  const macros = w && target ? macroSplit(target, w, goal) : null;

  return (
    <div className="space-y-8">
      <header>
        <div className="mono-label">USER PROFILE</div>
        <h1 className="font-display text-4xl mt-1">{name}</h1>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] mt-1">
          {user.email}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <MonoStat label="BMI" value={b ? b.toFixed(1) : "—"} unit={b ? bmiCategory(b).slice(0, 4).toUpperCase() : undefined} />
        </Card>
        <Card>
          <MonoStat label="BMR" value={bm ? Math.round(bm) : "—"} unit="kcal" />
        </Card>
        <Card>
          <MonoStat
            label={
              tdeeSource === "whoop"
                ? `TDEE · WHOOP ${measured!.samples}D`
                : "TDEE · EST"
            }
            value={td ? Math.round(td) : "—"}
            unit="kcal"
          />
        </Card>
        <Card>
          <MonoStat label="TARGET" value={target || "—"} unit="kcal" accent />
        </Card>
      </section>

      {macros && (
        <Card>
          <CardLabel>RECOMMENDED MACROS</CardLabel>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <MonoStat label="PROTEIN" value={macros.proteinG} unit="g" />
            <MonoStat label="CARBS" value={macros.carbsG} unit="g" />
            <MonoStat label="FAT" value={macros.fatG} unit="g" />
          </div>
        </Card>
      )}

      <Card>
        <CardLabel>EDIT</CardLabel>
        <ProfileForm initial={p} />
      </Card>

      <Card>
        <CardLabel>APPEARANCE</CardLabel>
        <div className="mt-2 -mx-3">
          <ThemeToggle />
        </div>
      </Card>

      <Card>
        <CardLabel>SECURITY · CHANGE PASSWORD</CardLabel>
        <PasswordForm />
      </Card>
    </div>
  );
}
