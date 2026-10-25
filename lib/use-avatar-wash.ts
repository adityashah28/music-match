"use client";

import { useEffect, useState } from "react";
import {
  fallbackPalette,
  paletteFromAvatar,
  softGradient,
  type AvatarPalette,
} from "@/lib/avatar-gradient";

/**
 * Soft header wash + chip tone for a person. Starts with a seed fallback
 * (initials color), then swaps in photo-derived colors when sampling succeeds.
 */
export function useAvatarWash(
  avatarUrl: string | null | undefined,
  seed: string,
): { gradient: string; chip: string } {
  const [palette, setPalette] = useState<AvatarPalette>(() => fallbackPalette(seed));

  useEffect(() => {
    const fallback = fallbackPalette(seed);
    setPalette(fallback);

    const url = avatarUrl?.trim();
    if (!url) return;

    let cancelled = false;
    paletteFromAvatar(url).then((extracted) => {
      if (!cancelled && extracted) setPalette(extracted);
    });

    return () => {
      cancelled = true;
    };
  }, [avatarUrl, seed]);

  return {
    gradient: softGradient(palette.colors),
    chip: palette.chip,
  };
}
