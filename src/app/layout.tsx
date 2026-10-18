import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GarminProvider } from "@/components/garmin-provider";
import { Nav } from "@/components/nav";
import { UpdateBanner } from "@/components/update-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRV Health",
  description: "Calories eaten vs burned, weight and weekly progress",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <UpdateBanner />
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
              <span className="inline-block h-6 w-6 rounded-lg bg-gradient-to-br from-accent to-deficit-mark" aria-hidden />
              BRV Health
            </Link>
            <div className="-mx-1 w-full min-w-0 sm:mx-0 sm:ml-auto sm:w-auto">
              <Nav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">
          <GarminProvider>{children}</GarminProvider>
        </main>
      </body>
    </html>
  );
}
