import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "or9.space",
  description: "Multi-tenant org platform for Star Citizen crews",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
