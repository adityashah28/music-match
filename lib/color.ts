import { Vibrant } from "node-vibrant/node";

const COLOR_TIMEOUT_MS = 5000;

export async function dominantColorFromImage(
  imageUrl: string | null | undefined,
): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    const palette = await Promise.race([
      Vibrant.from(imageUrl).getPalette(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), COLOR_TIMEOUT_MS);
      }),
    ]);
    if (!palette) return null;
    return (
      palette.Vibrant?.hex ??
      palette.DarkVibrant?.hex ??
      palette.Muted?.hex ??
      palette.DarkMuted?.hex ??
      null
    );
  } catch {
    return null;
  }
}
