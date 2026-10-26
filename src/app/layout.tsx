import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "UNIK TRENDS | Wholesale Streetwear Nigeria",
    template: "%s | UNIK TRENDS",
  },
  description:
    "UNIK TRENDS produces and wholesales Nigerian streetwear — baggy denim, hoodies and sets. Factory-direct prices for resellers. Tejuosho Plaza, Yaba, Lagos. Founded by Michael Agunama Udochukwu.",
  applicationName: "UNIK TRENDS",
  authors: [{ name: "Michael Agunama Udochukwu" }, { name: "GLASSKID", url: "https://glasskid.vercel.app" }],
  creator: "Michael Agunama Udochukwu",
  publisher: "UNIK TRENDS",
  keywords: [
    "UNIK TRENDS",
    "wholesale streetwear Nigeria",
    "baggy jeans wholesale Lagos",
    "Tejuosho Yaba clothes",
    "reseller fashion Nigeria",
    "Michael Agunama Udochukwu",
  ],
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
  openGraph: {
    title: "UNIK TRENDS | Wholesale Streetwear",
    description:
      "Factory-direct Nigerian streetwear for resellers. Book or order online. Tejuosho, Yaba, Lagos.",
    siteName: "UNIK TRENDS",
    locale: "en_NG",
    type: "website",
  },
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
    <html lang="en" className="dark" suppressHydrationWarning>
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
