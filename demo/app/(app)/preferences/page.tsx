"use client";

import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { PreferencesEditor } from "./preferences-editor";

export default function PreferencesPage() {
  const { state } = useDemoStore();
  const prefs = state.foodPreferences;

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
