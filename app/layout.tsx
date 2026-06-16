import "./globals.css";
import type { ReactNode } from "react";
import { Oswald, Inter, IBM_Plex_Sans, Black_Ops_One, JetBrains_Mono } from "next/font/google";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

// Tenant "MFD" tactical theme fonts (ported from the Freedom Guards site).
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});
const blackOps = Black_Ops_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-blackops",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata = {
  title: "or9.space",
  description: "Multi-tenant org platform for Star Citizen crews",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${inter.variable} ${plex.variable} ${blackOps.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
