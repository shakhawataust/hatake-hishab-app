import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hatake Hishab — Farm Management",
  description: "Role-aware, multi-user farm operations management.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Hatake Hishab" },
};

export const viewport: Viewport = {
  themeColor: "#1e7048",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
