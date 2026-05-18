// Demo stub: no real Whoop API calls.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WhoopRecord = any;

export async function fetchProfile(_userId: string): Promise<unknown> {
  return null;
}

export async function fetchBodyMeasurement(_userId: string): Promise<unknown> {
  return null;
}

export async function fetchRecovery(
  _userId: string,
  _sinceIso: string,
): Promise<WhoopRecord[]> {
  return [];
}

export async function fetchSleep(
  _userId: string,
  _sinceIso: string,
): Promise<WhoopRecord[]> {
  return [];
}

export async function fetchCycles(
  _userId: string,
  _sinceIso: string,
): Promise<WhoopRecord[]> {
  return [];
}

export async function fetchWorkouts(
  _userId: string,
  _sinceIso: string,
): Promise<WhoopRecord[]> {
  return [];
}
