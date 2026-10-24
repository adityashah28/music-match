import type { Metadata, Viewport } from "next";
import { Inter, Sulphur_Point } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const sulphurPoint = Sulphur_Point({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-sulphur-point",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      className={`${sulphurPoint.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-dvh text-[var(--foreground)]`}>
        <div className="relative min-h-dvh w-full">
          <SiteHeader />
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
