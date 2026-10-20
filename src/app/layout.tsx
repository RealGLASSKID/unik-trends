import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/lib/app";
import { Header, Footer, WhatsAppButton } from "@/components/Chrome";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "UNIK TRENDS | Wholesale Streetwear",
  description: "Trendy Nigerian streetwear at wholesale prices for resellers.",
  applicationName: "UNIK TRENDS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UNIK TRENDS",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#333333",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;700&display=swap"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <AppProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <WhatsAppButton />
          <PwaRegister />
        </AppProvider>
      </body>
    </html>
  );
}
