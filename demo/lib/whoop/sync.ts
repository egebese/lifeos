// Demo stub: no real Whoop sync.

export type SyncResult = {
  recovery: number;
  sleep: number;
  strain: number;
  workouts: number;
  errors: Record<string, string>;
  sinceDays: number;
};

export async function syncAll(
  _userId: string,
  sinceDays = 30,
): Promise<SyncResult> {
  return {
    recovery: 0,
    sleep: 0,
    strain: 0,
    workouts: 0,
    errors: {},
    sinceDays,
  };
}
