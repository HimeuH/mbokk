import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Nav } from "@/components/nav";
import { SetPinPrompt } from "@/components/set-pin-prompt";
import { QueryProvider } from "./query-provider";
import "./globals.css";

// Mbokk — Indigo & Brass Ledger type system. Display + body + data faces.
// Provisional Google Fonts pick; swap for a licensed face without touching call sites.
const displaySerif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const bodySerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dataMono = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Mbokk",
  description: "Registre de famille numérique du Sénégal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html
      lang="fr"
      className={`${displaySerif.variable} ${bodySerif.variable} ${dataMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <Nav />
            <SetPinPrompt />
            {children}
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
