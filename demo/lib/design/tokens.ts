// Nothing Design System tokens (v3.0.0) — see ~/.claude/skills/nothing-design/references/tokens.md
// Mirrored here as TS constants for runtime use (charts, inline styles).

export const colors = {
  dark: {
    black: "#000000",
    surface: "#111111",
    surfaceRaised: "#1A1A1A",
    border: "#222222",
    borderVisible: "#333333",
    textDisabled: "#666666",
    textSecondary: "#999999",
    textPrimary: "#E8E8E8",
    textDisplay: "#FFFFFF",
    interactive: "#5B9BF6",
  },
  light: {
    black: "#F5F5F5",
    surface: "#FFFFFF",
    surfaceRaised: "#F0F0F0",
    border: "#E8E8E8",
    borderVisible: "#CCCCCC",
    textDisabled: "#999999",
    textSecondary: "#666666",
    textPrimary: "#1A1A1A",
    textDisplay: "#000000",
    interactive: "#007AFF",
  },
  status: {
    accent: "#D71921",
    accentSubtle: "rgba(215,25,33,0.15)",
    success: "#4A9E5C",
    warning: "#D4A843",
    error: "#D71921",
  },
} as const;

export const space = {
  "2xs": 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
  "4xl": 96,
} as const;

export const typeScale = {
  displayXl: { size: 72, lineHeight: 1.0, tracking: "-0.03em" },
  displayLg: { size: 48, lineHeight: 1.05, tracking: "-0.02em" },
  displayMd: { size: 36, lineHeight: 1.1, tracking: "-0.02em" },
  heading: { size: 24, lineHeight: 1.2, tracking: "-0.01em" },
  subheading: { size: 18, lineHeight: 1.3, tracking: "0" },
  body: { size: 16, lineHeight: 1.5, tracking: "0" },
  bodySm: { size: 14, lineHeight: 1.5, tracking: "0.01em" },
  caption: { size: 12, lineHeight: 1.4, tracking: "0.04em" },
  label: { size: 11, lineHeight: 1.2, tracking: "0.08em" },
} as const;
