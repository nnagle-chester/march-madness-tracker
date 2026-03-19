import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brett's Angels - March Madness Pool",
  description: "March Madness pool tracker for Brett's Angels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen bg-[#f8f9fa] ${inter.className}`}>{children}</body>
    </html>
  );
}
