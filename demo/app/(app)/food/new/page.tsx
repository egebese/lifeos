import { Card, CardLabel } from "@/components/ui/card";
import { AiMealForm } from "./ai-meal-form";
import { NewFoodForm } from "./new-food-form";

export default function NewFoodPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">LOG ENTRY</div>
        <h1 className="font-display text-4xl mt-1">new meal</h1>
      </header>

      <Card>
        <AiMealForm />
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--border)]" />
        <span className="mono-label">OR · PHOTO / MANUAL</span>
        <div className="flex-1 h-px bg-[color:var(--border)]" />
      </div>

      <Card>
        <CardLabel>SINGLE ITEM</CardLabel>
        <NewFoodForm />
      </Card>
    </div>
  );
}
