import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Opportunity Feed",
  description: "A curated feed of travel opportunities from PDX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}