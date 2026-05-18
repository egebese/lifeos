import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { AiProgramForm } from "./ai-program-form";
import { NewProgramForm } from "./new-program-form";

export default async function NewProgramPage() {
  await requireSession();
  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">CREATE</div>
        <h1 className="font-display text-4xl mt-1">new program</h1>
      </header>

      <Card>
        <AiProgramForm />
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--border)]" />
        <span className="mono-label">OR · MANUAL</span>
        <div className="flex-1 h-px bg-[color:var(--border)]" />
      </div>

      <Card>
        <CardLabel>BLANK PROGRAM</CardLabel>
        <NewProgramForm />
      </Card>
    </div>
  );
}
