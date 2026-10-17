import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GarminProvider } from "@/components/garmin-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRV Health",
  description: "Daily calories eaten vs burned",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-3xl items-center gap-5 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">BRV Health</Link>
            <Link href="/" className="text-muted hover:text-foreground">Today</Link>
            <Link href="/history" className="text-muted hover:text-foreground">History</Link>
            <Link href="/backup" className="ml-auto text-muted hover:text-foreground">Backup</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          <GarminProvider>{children}</GarminProvider>
        </main>
      </body>
    </html>
  );
}
