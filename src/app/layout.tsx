import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hatake Hishab — Farm Management",
  description: "Role-aware, multi-user farm operations management.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
