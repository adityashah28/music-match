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
      className={className}
      style={style}
      preload={preload}
      loading={loading}
      sizes={`${size}px`}
    />
  );
}
