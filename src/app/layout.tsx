import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-[#0a0a0f]">{children}</body>
    </html>
  );
}
