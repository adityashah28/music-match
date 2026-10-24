import Image from "next/image";
import type { CSSProperties } from "react";
import { sizedPortraitUrl, type PortraitSize } from "@/lib/portraits";

type ArtistImageProps = {
  src?: string | null;
  alt?: string;
  /** Intrinsic/request size; also used as width/height when not fill. */
  size: PortraitSize;
  className?: string;
  style?: CSSProperties;
  fill?: boolean;
  sizes?: string;
  /** next/image quality 1–100 (default 75). */
  quality?: number;
  /** Preload above-the-fold / LCP images (Next.js 16). */
  preload?: boolean;
  loading?: "eager" | "lazy";
};

/**
 * Optimized artist portrait via next/image + Deezer size rewrite.
 */
export function ArtistImage({
  src,
  alt = "",
  size,
  className,
  style,
  fill,
  sizes,
  quality,
  preload,
  loading,
}: ArtistImageProps) {
  const url = sizedPortraitUrl(src, size);
  if (!url) return null;

  if (fill) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        quality={quality}
        className={className}
        style={style}
        preload={preload}
        loading={loading}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={size}
      height={size}
      quality={quality}
      className={className}
      style={style}
      preload={preload}
      loading={loading}
      sizes={sizes ?? `${size}px`}
    />
  );
}
