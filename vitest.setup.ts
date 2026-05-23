// jest-dom matchers (toBeInTheDocument, etc.) are only meaningful in a DOM
// environment. Loading them in the default "node" environment is harmless but
// guarded so the pure-logic lib tests stay fast and dependency-free.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}
