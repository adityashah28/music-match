import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Khula } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const khula = Khula({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-khula",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Resonate",
    template: "%s · Resonate",
  },
  description: "Match people by music taste and see shows.",
  applicationName: "Resonate",
  appleWebApp: {
    capable: true,
    title: "Resonate",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Light by default; ThemeToggle updates the bar color when someone switches to dark
  themeColor: "#f4f5f7",
  colorScheme: "light dark",
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("resonate_theme");if(t!=="dark")t="light";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${khula.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply a saved dark-mode choice before first paint so it never flashes white.
            Light is the default; dark only after someone picks it with the toggle. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className={`${khula.className} min-h-dvh text-[var(--foreground)]`}
        suppressHydrationWarning
      >
        <div className="relative min-h-dvh w-full">
          <SiteHeader />
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
