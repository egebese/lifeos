// Demo stub: no database. Throws if anything actually tries to call it.
// All real callers have been migrated to the localStorage-backed demo store.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = new Proxy(
  {},
  {
    get() {
      throw new Error("db is not available in demo mode");
    },
  },
);
