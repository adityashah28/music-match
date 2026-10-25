/**
 * Detect Discord / Instagram / Facebook / TikTok / etc. in-app browsers.
 * Google OAuth often fails inside these WebViews — prompt an external browser instead.
 */
export function isInAppBrowser(userAgent?: string): boolean {
  if (typeof navigator === "undefined" && !userAgent) return false;
  const ua = userAgent ?? navigator.userAgent;

  const markers = [
    "FBAN",
    "FBAV",
    "Facebook",
    "Instagram",
    "Line/",
    "MicroMessenger",
    "Twitter",
    "LinkedInApp",
    "Snapchat",
    "Discord",
    "TikTok",
    "BytedanceWebview",
    "musical_ly",
    "Pinterest",
    "Reddit",
    "WhatsApp",
    "Messenger",
  ];

  if (markers.some((marker) => ua.includes(marker))) return true;

  // Android WebView marker (`; wv)`), excluding Chrome/Firefox standalone.
  if (/\bwv\b/i.test(ua) && /Android/i.test(ua)) return true;

  return false;
}

/** Safari on iOS/macOS, Chrome elsewhere — for the "Open in …" copy. */
export function preferredExternalBrowser(userAgent?: string): "Safari" | "Chrome" {
  if (typeof navigator === "undefined" && !userAgent) return "Chrome";
  const ua = userAgent ?? navigator.userAgent;
  if (/iPhone|iPad|iPod|Macintosh/i.test(ua)) return "Safari";
  return "Chrome";
}
