import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Assuming you'll create this for global styles

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hypothesis-to-Experiment Orchestrator",
  description: "Automating AI-driven scientific research workflows | HEO",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
