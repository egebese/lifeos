"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartDayForm({
  programId,
  programDayId,
}: {
  programId: string;
  programDayId: string;
}) {
  const router = useRouter();
  async function start() {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programId, programDayId }),
    });
    const data = await res.json();
    if (data?.id) router.push(`/workouts/${data.id}`);
  }
  return (
    <Button onClick={start} variant="accent">
      START DAY →
    </Button>
  );
}
