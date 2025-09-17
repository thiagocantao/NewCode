const DEFAULT_FONT_FAMILY = "Roboto, Arial, sans-serif";

const TYPOGRAPHY_VARIABLE_ID = "5e429bf8-2fe3-42e4-a41d-e3b4ac1b52fa";

function sanitizeFontFamily(fontFamily) {
  if (typeof fontFamily !== "string") {
    return "";
  }

  const trimmed = fontFamily.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export function readTypographyVariable() {
  try {
    if (typeof window === "undefined") {
      return "";
    }

    const getter = window?.wwLib?.wwVariable?.getValue;
    if (typeof getter !== "function") {
      return "";
    }

    const typographySettings = getter(TYPOGRAPHY_VARIABLE_ID);
    return sanitizeFontFamily(typographySettings?.fontFamily);
  } catch (error) {
    console.warn("[GridViewDinamica] Failed to read typography variable", error);
    return "";
  }
}

export function resolveTypographyFontFamily(customFallback) {
  const typographyFontFamily = readTypographyVariable();
  if (typographyFontFamily) {
    return typographyFontFamily;
  }

  const fallback = sanitizeFontFamily(customFallback);
  if (fallback) {
    return fallback;
  }

  return DEFAULT_FONT_FAMILY;
}

export function applyGlobalGridFontFamily(fontFamily) {
  if (typeof document === "undefined") {
    return;
  }

  const target = document.documentElement;
  if (!fontFamily) {
    target.style.removeProperty("--grid-view-dinamica-font-family");
    return;
  }

  target.style.setProperty("--grid-view-dinamica-font-family", fontFamily);
}

export { DEFAULT_FONT_FAMILY, TYPOGRAPHY_VARIABLE_ID };
