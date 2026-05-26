import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { HeaderAuth } from "@/components/HeaderAuth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vektra Admin",
  description: "Admin console for Vektra",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-zinc-50 text-zinc-900 antialiased`}
      >
        <AuthProvider>
          <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm font-semibold tracking-tight text-emerald-800">
                Vektra Admin
              </div>
              <HeaderAuth />
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
