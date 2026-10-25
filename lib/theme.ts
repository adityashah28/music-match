export type Theme = "light" | "dark";

/** Saved choice; when unset the app is light (see the script in app/layout.tsx). */
export const THEME_KEY = "resonate_theme";

/** Browser bar color per theme (matches --background in app/globals.css). */
export const THEME_BAR_COLOR: Record<Theme, string> = { light: "#f4f5f7", dark: "#0e0f11" };
