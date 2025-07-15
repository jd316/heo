import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Global styles
import Link from 'next/link';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hypothesis-to-Experiment Orchestrator",
  description: "Automating AI-driven scientific research workflows | HEO",
  openGraph: {
    title: 'Hypothesis-to-Experiment Orchestrator',
    description: 'Automating AI-driven scientific research workflows | HEO',
    url: 'https://heo.example.com',
    siteName: 'HEO',
    images: ['/og.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hypothesis-to-Experiment Orchestrator',
    description: 'Automating AI-driven scientific research workflows | HEO',
    images: ['https://heo.example.com/og.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = "width=device-width, initial-scale=1";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content={viewport} />
      </head>
      <body className={`${inter.className} relative flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-gray-100`}>  
        {/* Global background overlay (optional noise texture) */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800 opacity-50 pointer-events-none" />
        {/* Header */}
        <header className="bg-gray-800 shadow">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 text-gray-100">
              <span className="text-2xl">🧬</span>
              <span className="text-xl font-bold">HEO</span>
            </Link>
            <nav className="space-x-4 flex items-center">
              <Link href="/" className="text-gray-200 hover:text-white">Home</Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-grow container mx-auto px-4 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-400">
            Built for <strong>Bio x AI Hackathon 2025</strong> • Track: BioAgents • MIT License
          </div>
        </footer>
      </body>
    </html>
  );
}
