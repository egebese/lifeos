"use client";

import { useRouter } from "next/navigation";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export function StartDayForm({
  programId,
  programDayId,
}: {
  programId: string;
  programDayId: string;
}) {
  const t = useT();
  const router = useRouter();
  const { update } = useDemoStore();

  function start() {
    const id = generateId();
    update((prev) => ({
      workouts: [
        {
          id,
          userId: DEMO_USER_ID,
          programId,
          programDayId,
          startedAt: new Date(),
          endedAt: null,
          notes: null,
          source: "manual",
        },
        ...prev.workouts,
      ],
    }));
    router.push(`/workouts/${id}`);
  }

  return (
    <Button onClick={start} variant="accent">
      {t("work.startDay")}
    </Button>
  );
}
