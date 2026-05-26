import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/MainNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vektra",
  description: "Earn Vektras for completing tasks",
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
        <MainNav />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">{children}</main>
      </body>
    </html>
  );
}
