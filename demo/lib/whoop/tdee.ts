// Demo stub: no real Whoop-derived TDEE. The dashboard falls back gracefully
// to the formula-based TDEE when this returns null.
export async function getMeasuredTdee(
  _userId: string,
  _opts: { lookbackDays?: number; minSamples?: number } = {},
): Promise<{ kcal: number; samples: number; sinceDate: string } | null> {
  return null;
}
