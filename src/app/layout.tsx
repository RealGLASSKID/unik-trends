import "./globals.css";
import type { Metadata } from "next";
import { AppProvider } from "@/lib/app";
import { Header, Footer, WhatsAppButton } from "@/components/Chrome";

export const metadata: Metadata = { title: "UNIK TRENDS | Wholesale Streetwear", description: "Trendy Nigerian streetwear at wholesale prices for resellers." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;700&display=swap" />
      </head>
      <body>
        <AppProvider>
          <div className="flex min-h-screen flex-col"><Header /><main className="flex-1">{children}</main><Footer /></div>
          <WhatsAppButton />
        </AppProvider>
      </body>
    </html>
  );
}
