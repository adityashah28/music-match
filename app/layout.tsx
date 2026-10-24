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
  themeColor: "#f4f5f7",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${khula.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${khula.className} min-h-dvh text-[var(--foreground)]`}>
        <div className="relative min-h-dvh w-full">
          <SiteHeader />
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
